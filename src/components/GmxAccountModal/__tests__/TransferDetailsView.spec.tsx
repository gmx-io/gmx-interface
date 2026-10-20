import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";
import type { MultichainFundingHistoryItem } from "domain/multichain/types";

import { TransferDetailsView } from "../TransferDetailsView";

const mocks = vi.hoisted(() => ({
  selectedTransfer: undefined as MultichainFundingHistoryItem | undefined,
}));

vi.mock("context/GmxAccountContext/hooks", () => {
  const stateHook = () => [undefined, () => undefined] as const;

  return {
    useGmxAccountDepositViewChain: stateHook,
    useGmxAccountDepositViewTokenAddress: stateHook,
    useGmxAccountDepositViewTokenInputValue: stateHook,
    useGmxAccountModalOpen: stateHook,
    useGmxAccountSelectedTransferGuid: stateHook,
    useGmxAccountWithdrawalViewChain: stateHook,
    useGmxAccountWithdrawalViewTokenAddress: stateHook,
    useGmxAccountWithdrawalViewTokenInputValue: stateHook,
  };
});

vi.mock("domain/multichain/useGmxAccountFundingHistory", () => ({
  useGmxAccountFundingHistoryItem: () => ({ transfer: mocks.selectedTransfer, isLoading: false, error: undefined }),
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: ARBITRUM }),
}));

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

function createTransfer(overrides: Partial<MultichainFundingHistoryItem>): MultichainFundingHistoryItem {
  return {
    id: "0x" + "ab".repeat(32),
    operation: "deposit",
    step: "sent",
    settlementChainId: ARBITRUM,
    sourceChainId: SOURCE_BASE_MAINNET,
    account: "0x1111111111111111111111111111111111111111",
    token: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    sentAmount: 10_000_000n,
    receivedAmount: undefined,
    sentTxn: "0x" + "cd".repeat(32),
    sentTimestamp: 1_760_000_000,
    receivedTxn: undefined,
    receivedTimestamp: undefined,
    isExecutionError: true,
    executedTxn: undefined,
    executedTimestamp: undefined,
    ...overrides,
  };
}

function renderView(transfer: MultichainFundingHistoryItem) {
  mocks.selectedTransfer = transfer;

  return render(
    <I18nProvider i18n={i18n}>
      <TransferDetailsView />
    </I18nProvider>
  );
}

describe("TransferDetailsView execution error alert", () => {
  afterEach(() => {
    cleanup();
    mocks.selectedTransfer = undefined;
  });

  it("says the withdrawal failed for a failed withdrawal", () => {
    const view = renderView(createTransfer({ operation: "withdrawal" }));

    expect(view.queryByText("Withdrawal to Base failed")).not.toBeNull();
    expect(view.queryByText(/Deposit from/)).toBeNull();
  });

  it("names the settlement chain for a failed same-chain withdrawal", () => {
    const view = renderView(createTransfer({ operation: "withdrawal", sourceChainId: 0 }));

    expect(view.queryByText("Withdrawal to Arbitrum failed")).not.toBeNull();
  });

  it("says the deposit failed for a failed deposit", () => {
    const view = renderView(createTransfer({ operation: "deposit" }));

    expect(view.queryByText("Deposit from Base failed")).not.toBeNull();
    expect(view.queryByText(/Withdrawal to/)).toBeNull();
  });

  it("shows no failure alert when the transfer did not fail", () => {
    const view = renderView(createTransfer({ operation: "withdrawal", isExecutionError: false }));

    expect(view.queryByText(/failed/)).toBeNull();
  });
});
