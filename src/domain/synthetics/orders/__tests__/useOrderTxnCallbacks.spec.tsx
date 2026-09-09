import { i18n } from "@lingui/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PendingTransaction } from "context/PendingTxnsContext/PendingTxnsContext";
import type { DecreasePositionAmounts } from "domain/synthetics/trade";
import { createMockPositionInfo } from "domain/testUtils/mockPositionInfo";
import { buildTpSlBatchPayloads } from "domain/tpsl/sidecar";
import type { PendingTpSlOrderBatch } from "domain/tpsl/types";
import { expandDecimals } from "lib/numbers";
import { TxnEventBuilder } from "lib/transactions";
import { OrderType } from "sdk/utils/orders/types";

import type { BatchOrderTxnCtx } from "../sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "../useOrderTxnCallbacks";

const state = vi.hoisted(() => ({
  batches: [] as PendingTpSlOrderBatch[],
  pendingTxns: [] as PendingTransaction[],
  srcChainId: undefined as number | undefined,
  setPendingOrder: vi.fn(),
  setPendingExpressTxn: vi.fn(),
  updatePendingExpressTxn: vi.fn(),
  errorToast: vi.fn(),
}));

vi.mock("context/SyntheticsEvents", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSyntheticsEvents: () => ({
    orderStatuses: {},
    setPendingTpSlOrderBatches: (update: (batches: PendingTpSlOrderBatch[]) => PendingTpSlOrderBatch[]) => {
      state.batches = update(state.batches);
    },
    setPendingOrder: state.setPendingOrder,
    setPendingExpressTxn: state.setPendingExpressTxn,
    updatePendingExpressTxn: state.updatePendingExpressTxn,
  }),
}));
vi.mock("context/PendingTxnsContext/PendingTxnsContext", () => ({
  usePendingTxns: () => ({
    setPendingTxns: (update: (txns: PendingTransaction[]) => PendingTransaction[]) => {
      state.pendingTxns = update(state.pendingTxns);
    },
  }),
}));
vi.mock("context/SettingsContext/SettingsContextProvider", () => ({ useSettings: () => ({}) }));
vi.mock("context/TokenPermitsContext/TokenPermitsContextProvider", () => ({ useTokenPermitsContext: () => ({}) }));
vi.mock("context/TokensBalancesContext/TokensBalancesContextProvider", () => ({
  useTokensBalancesUpdates: () => ({ addOptimisticTokensBalancesUpdates: vi.fn() }),
}));
vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSelector: (selector: (s: unknown) => unknown) =>
    selector({ globals: { ordersInfo: { ordersInfoData: {} }, tokensDataResult: {} } }),
}));
vi.mock("lib/chains", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useChainId: () => ({ chainId: 42161, srcChainId: state.srcChainId }),
}));
vi.mock("lib/useBlockNumber", () => ({ useBlockNumber: () => 1n }));
vi.mock("lib/helperToast", () => ({ helperToast: { success: vi.fn(), error: state.errorToast } }));
vi.mock("domain/synthetics/subaccount", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getRemainingSubaccountActions: () => 100n,
}));

const position = createMockPositionInfo({ account: "0x1111111111111111111111111111111111111111" });
const batchParams = buildTpSlBatchPayloads({
  chainId: 42161,
  account: position.account,
  marketAddress: position.marketAddress,
  indexTokenAddress: position.indexToken.address,
  collateralTokenAddress: position.collateralTokenAddress,
  isLong: true,
  autoCancelOrdersLimit: 2,
  entries: [OrderType.LimitDecrease, OrderType.StopLossDecrease].map((triggerOrderType) => ({
    amounts: {
      isFullClose: false,
      sizeDeltaUsd: expandDecimals(100, 30),
      sizeDeltaInTokens: expandDecimals(1, 18),
      collateralDeltaAmount: 0n,
      triggerPrice: expandDecimals(triggerOrderType === OrderType.LimitDecrease ? 2500 : 1500, 30),
      acceptablePrice: 0n,
      triggerOrderType,
      decreaseSwapType: 0,
    } as DecreasePositionAmounts,
    executionFeeAmount: 1n,
    executionGasLimit: 1n,
  })),
  userReferralCode: undefined,
});

let callback: ReturnType<ReturnType<typeof useOrderTxnCallbacks>["makeOrderTxnCallback"]>;
function Harness() {
  callback = useOrderTxnCallbacks().makeOrderTxnCallback({ actionName: "Add TP/SL" });
  return null;
}

function events(mode: "wallet" | "express" | "one-click" | "gmx-account") {
  state.srcChainId = mode === "gmx-account" ? 1 : undefined;
  render(<Harness />);
  return new TxnEventBuilder<BatchOrderTxnCtx>({
    batchId: "batch",
    batchParams,
    signer: {} as BatchOrderTxnCtx["signer"],
    expressParams:
      mode === "wallet"
        ? undefined
        : ({
            isGmxAccount: mode === "gmx-account",
            gasPaymentParams: { gasPaymentTokenAddress: position.collateralTokenAddress, gasPaymentTokenAmount: 1n },
            gasLimit: 1n,
            relayParamsPayload: { tokenPermits: [], externalCalls: { externalCallDataList: [] } },
            subaccount: mode === "one-click" ? { signedApproval: {} } : undefined,
          } as unknown as BatchOrderTxnCtx["expressParams"]),
  });
}

beforeEach(() => {
  i18n.load("en", {});
  i18n.activate("en");
  state.batches = [];
  state.pendingTxns = [];
  vi.clearAllMocks();
});
afterEach(cleanup);

describe.each(["wallet", "express", "one-click", "gmx-account"] as const)("%s TP/SL creation tracking", (mode) => {
  it("registers every submitted entry and attaches its transaction identity", () => {
    const builder = events(mode);
    callback(builder.Submitted());
    expect(state.batches).toHaveLength(1);
    expect(state.batches[0].orders.map((order) => order.orderType)).toEqual([
      OrderType.LimitDecrease,
      OrderType.StopLossDecrease,
    ]);
    callback(builder.Sending());
    callback(
      builder.Sent(
        mode === "wallet"
          ? { type: "wallet", transactionHash: "tx" }
          : { type: "relay", relayTaskId: "task", relayProvider: "gelato" }
      )
    );
    expect(state.batches[0]).toMatchObject(mode === "wallet" ? { transactionHash: "tx" } : { relayTaskId: "task" });
    expect(state.setPendingOrder).toHaveBeenCalledTimes(1);
  });

  it("clears rejected submissions and preserves the existing error feedback", () => {
    const builder = events(mode);
    callback(builder.Submitted());
    callback(builder.Error(new Error("Rejected")));
    expect(state.batches).toEqual([]);
    expect(state.errorToast).toHaveBeenCalledTimes(1);
  });
});

it("removes a wallet batch when receipt polling reports an on-chain failure", () => {
  const builder = events("wallet");
  callback(builder.Submitted());
  callback(builder.Sent({ type: "wallet", transactionHash: "tx" }));
  expect(state.batches).toHaveLength(1);
  state.pendingTxns[0].onError?.();
  expect(state.batches).toEqual([]);
});

it("tracks the replacement hash when a wallet TP/SL transaction is sped up", () => {
  const builder = events("wallet");
  callback(builder.Submitted());
  callback(builder.Sent({ type: "wallet", transactionHash: "tx" }));
  expect(state.pendingTxns[0].chainId).toBe(42161);
  state.pendingTxns[0].onReplaced?.("replacement");
  expect(state.batches[0].transactionHash).toBe("replacement");
});
