import { act, cleanup, render } from "@testing-library/react";
import { ReactNode, useState } from "react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import { writeStoredTransitRouteProgress } from "domain/synthetics/paxosTransit/transitRouteProgress";
import { ARBITRUM } from "sdk/configs/chains";
import type { TransitOrder, TransitOrderStatus } from "sdk/utils/paxos/types";

import { useTransitRouteEvents } from "../useTransitRouteEvents";

const { fetchTransitOrder } = vi.hoisted(() => ({ fetchTransitOrder: vi.fn() }));

vi.mock("context/GmxSdkContext/GmxSdkContext", () => ({
  useGmxSdk: () => ({ fetchTransitOrder }),
}));

const order = (status: TransitOrderStatus) => ({ id: "0xorder", status }) as TransitOrder;

function TestSWRProvider({ children }: { children: ReactNode }) {
  // eslint-disable-next-line react/hook-use-state
  const [value] = useState(() => ({ provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false }));
  return <SWRConfig value={value}>{children}</SWRConfig>;
}

function Harness({ onStatus }: { onStatus: (status: TransitOrderStatus | undefined) => void }) {
  onStatus(useTransitRouteEvents(ARBITRUM, { glvAndGmMarketsData: {}, withdrawalStatuses: {} }).paxosTransitOrder?.status);
  return null;
}

describe("useTransitRouteEvents", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
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
});
