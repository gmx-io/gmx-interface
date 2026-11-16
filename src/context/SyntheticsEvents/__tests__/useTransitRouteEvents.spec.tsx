import { act, cleanup, render } from "@testing-library/react";
import { ReactNode, useState } from "react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getPaxosTransitConfig } from "config/paxosTransit";
import {
  readStoredTransitRouteProgress,
  writeStoredTransitRouteProgress,
} from "domain/synthetics/paxosTransit/transitRouteProgress";
import {
  getIsTransitConversionProposed,
  storeTransitConversionProposal,
} from "domain/synthetics/paxosTransit/transitWalletProposals";
import { ARBITRUM } from "sdk/configs/chains";
import type { TransitOrder, TransitOrderStatus } from "sdk/utils/paxos/types";

import { useTransitRouteEvents } from "../useTransitRouteEvents";

const { fetchTransitOrder, fetchTransitOrders } = vi.hoisted(() => ({
  fetchTransitOrder: vi.fn(),
  fetchTransitOrders: vi.fn(),
}));

vi.mock("context/GmxSdkContext/GmxSdkContext", () => ({
  useGmxSdk: () => ({ fetchTransitOrder, fetchTransitOrders }),
}));

const order = (status: TransitOrderStatus) => ({ id: "0xorder", status }) as TransitOrder;

function TestSWRProvider({ children }: { children: ReactNode }) {
  // eslint-disable-next-line react/hook-use-state
  const [value] = useState(() => ({ provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false }));
  return <SWRConfig value={value}>{children}</SWRConfig>;
}

function Harness({ onStatus }: { onStatus: (status: TransitOrderStatus | undefined) => void }) {
  onStatus(
    useTransitRouteEvents(ARBITRUM, { glvAndGmMarketsData: {}, withdrawalStatuses: {} }).paxosTransitOrder?.status
  );
  return null;
}

describe("useTransitRouteEvents", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.resetAllMocks();
    localStorage.clear();
  });

  // SWR restarts the polling timer whenever refreshInterval changes, and the provider re-renders more often than the interval
  it("keeps polling the Paxos order while the provider re-renders every second PRO-4467", async () => {
    vi.useFakeTimers();
    fetchTransitOrder
      .mockResolvedValueOnce(order("PENDING_BRIDGE"))
      .mockResolvedValueOnce(order("PROCESSING"))
      .mockResolvedValue(order("PROCESSED"));
    writeStoredTransitRouteProgress({
      id: 1,
      chainId: ARBITRUM,
      account: "0x1111111111111111111111111111111111111111",
      direction: "usdcToUsdg",
      glvOrMarketAddress: undefined,
      withdrawalTxnHash: undefined,
      withdrawalExecutedTxnHash: undefined,
      conversion: { orderId: "0xorder", txnHash: undefined, offerAmount: 1_000_000n, isMocked: false },
      depositTxnHash: undefined,
      isContinueRequested: false,
      isDismissed: false,
    });

    let status: TransitOrderStatus | undefined;
    const tree = () => (
      <TestSWRProvider>
        <Harness onStatus={(value) => (status = value)} />
      </TestSWRProvider>
    );
    const view = render(tree());

    for (let second = 1; second <= 12; second++) {
      await act(() => vi.advanceTimersByTimeAsync(1_000));
      view.rerender(tree());
    }

    expect(status).toBe("PROCESSED");
  });

  it("finds a smart account order by address, keeps its id and shows its status PRO-4467", async () => {
    vi.useFakeTimers();
    const { usdcAddress, usdgAddress } = getPaxosTransitConfig(ARBITRUM)!;
    const found = {
      ...order("PROCESSING"),
      id: "0xfound",
      offerAsset: usdcAddress,
      wantAsset: usdgAddress,
      offerAmount: 1_000_000n,
      createdAt: new Date().toISOString(),
    } as TransitOrder;
    fetchTransitOrders.mockResolvedValueOnce({ orders: [] }).mockResolvedValue({ orders: [found] });
    storeTransitConversionProposal({ chainId: ARBITRUM, account: "0x1111111111111111111111111111111111111111" });
    fetchTransitOrder.mockResolvedValue(found);
    writeStoredTransitRouteProgress({
      id: 1,
      chainId: ARBITRUM,
      account: "0x1111111111111111111111111111111111111111",
      direction: "usdcToUsdg",
      glvOrMarketAddress: undefined,
      withdrawalTxnHash: undefined,
      withdrawalExecutedTxnHash: undefined,
      conversion: {
        orderId: undefined,
        txnHash: undefined,
        offerAmount: 1_000_000n,
        isMocked: false,
        submittedAt: Date.now(),
        knownOrderIds: [],
      },
      depositTxnHash: undefined,
      isContinueRequested: false,
      isDismissed: false,
    });

    let status: TransitOrderStatus | undefined;
    const tree = () => (
      <TestSWRProvider>
        <Harness onStatus={(value) => (status = value)} />
      </TestSWRProvider>
    );
    const view = render(tree());

    for (let second = 1; second <= 12; second++) {
      await act(() => vi.advanceTimersByTimeAsync(1_000));
      view.rerender(tree());
    }

    expect(status).toBe("PROCESSING");
    expect(readStoredTransitRouteProgress()?.conversion?.orderId).toBe("0xfound");
    expect(
      getIsTransitConversionProposed({ chainId: ARBITRUM, account: "0x1111111111111111111111111111111111111111" })
    ).toBe(false);
  });
});
