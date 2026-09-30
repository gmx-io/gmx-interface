import { act, cleanup, render } from "@testing-library/react";
import { zeroAddress } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";

import { type MultichainEventsState, useMultichainEvents } from "./useMultichainEvents";

const mocks = vi.hoisted(() => ({
  account: undefined as string | undefined,
  setSelectedTransferGuid: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: mocks.account }),
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: 42161, srcChainId: undefined }),
}));

vi.mock("context/GmxAccountContext/hooks", () => ({
  useGmxAccountSelectedTransferGuid: () => [undefined, mocks.setSelectedTransferGuid],
}));

vi.mock("context/WebsocketContext/subscribeToEvents", () => ({
  subscribeToComposeDeliveredEvents: () => vi.fn(),
  subscribeToMultichainApprovalEvents: () => vi.fn(),
  subscribeToOftReceivedEvents: () => vi.fn(),
  subscribeToOftSentEvents: () => vi.fn(),
}));

const ACCOUNT = "0xB6b59B4F1A1B5FbA09a230648b77411a4A2C637C";
const OTHER_ACCOUNT = "0x21222b1D3CD4B9E6dD75de17eA2E91bf0AB90b3E";

function renderWithTrackedDeposit() {
  let state!: MultichainEventsState;

  function TestComponent() {
    state = useMultichainEvents({ hasPageLostFocus: false });
    return null;
  }

  mocks.account = ACCOUNT;
  const { rerender } = render(<TestComponent />);

  act(() => {
    state.setMultichainSubmittedDeposit({
      amount: 300_000_000_000_000n,
      settlementChainId: ARBITRUM,
      sourceChainId: SOURCE_BASE_MAINNET,
      tokenAddress: zeroAddress,
      sentTxn: "0x8c1e39d27f1a9ebb0baec22e82b2295bf20c180004d5e39b40ae07ae04d7bc4b",
    });
  });

  return {
    connect(account: string | undefined) {
      mocks.account = account;
      rerender(<TestComponent />);
    },
    getPendingFunding: () => state.pendingMultichainFunding,
  };
}

describe("useMultichainEvents", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps tracked funding when the same account reconnects PRO-4392", () => {
    const view = renderWithTrackedDeposit();

    view.connect(undefined);
    view.connect(ACCOUNT);

    expect(view.getPendingFunding()).toHaveLength(1);
  });

  it("shows only the connected account's tracked funding", () => {
    const view = renderWithTrackedDeposit();

    view.connect(OTHER_ACCOUNT);
    expect(view.getPendingFunding()).toHaveLength(0);

    view.connect(ACCOUNT);
    expect(view.getPendingFunding()).toHaveLength(1);
  });
});
