import { i18n } from "@lingui/core";
import { getBase58Decoder } from "@solana/kit";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { useContext } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { GMSOL_MARKETS } from "config/gmsol/markets";
import { setIsSolanaNetworkSelected } from "config/solanaNetwork";
import { GmxSdkProvider } from "context/GmxSdkContext/GmxSdkContext";
import {
  SolanaOrderActionsContext,
  type SolanaOrderActions,
  type SolanaTriggerEntry,
} from "domain/solana/solanaOrderActions";
import { publishSolanaWalletSession } from "lib/solana/activeSession";
import { DecreasePositionSwapType, OrderType, type OrderInfo, type PositionOrderInfo } from "sdk/utils/orders/types";
import type { PositionInfo } from "sdk/utils/positions/types";
import type { DecreasePositionAmounts } from "sdk/utils/trade/types";

import { WRAPPED_SOL_MINT } from "./addresses";
import { setPendingGmsolSubmission, type PendingGmsolSubmission } from "./pendingSubmission";
import { GmsolTransactionError, GmsolWalletPromptTimeoutError, type GmsolSendResult } from "./sendOrderTransactions";
import type { GmsolOrderAction } from "./types";
import { getIsGmsolOrderSubmitting, useGmsolOrderTransactions } from "./useGmsolOrderTransactions";
import { GmsolOrderActionsProvider } from "../orderActions/GmsolOrderActionsProvider";
import { classifyOrderFailure, getPreparedWrappedLamports } from "../orderTracking/classifyOrderFailure";

const mocks = vi.hoisted(() => ({ prepare: vi.fn(), send: vi.fn(), sign: vi.fn(), toast: vi.fn(), status: vi.fn() }));
vi.mock("lib/solana/rpc", () => ({
  getSolanaRpc: () => ({
    getSignatureStatuses: () => ({ send: async () => ({ context: { slot: 3n }, value: [mocks.status()] }) }),
    getEpochInfo: () => ({ send: async () => ({ blockHeight: 2n, absoluteSlot: 3n }) }),
  }),
}));
vi.mock("lib/wallets/solanaWalletSession", () => ({
  useSolanaWalletSession: () => ({ address: "owner", signTransaction: mocks.sign }),
}));
vi.mock("react-toastify", () => ({
  toast: Object.assign(mocks.toast, { dismiss: mocks.toast, error: mocks.toast, update: mocks.toast }),
}));
vi.mock("./sendOrderTransactions", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  prepareGmsolOrderTransactions: (...args: unknown[]) => mocks.prepare(...args),
  sendGmsolOrderTransactions: (...args: unknown[]) => mocks.send(...args),
}));
vi.mock("../useGmsolAccountData", () => ({ refreshGmsolAccountDataAfterTransaction: vi.fn() }));
vi.mock("domain/gmsol/useGmsolWalletBalances", () => ({ getSolanaBalancesKey: vi.fn() }));
vi.mock("../useSolanaTradingEnabled", () => ({
  useSolanaTradingEnabled: () => ({ isSolanaTradingEnabled: true, isLoading: false }),
}));
vi.mock("lib/useHasOutdatedUi", () => ({ useHasOutdatedUi: () => false }));

const action: GmsolOrderAction = { type: "create", orders: [], atomic: false };
const sent = { signatures: ["sent"] } as unknown as GmsolSendResult;
let state!: ReturnType<typeof useGmsolOrderTransactions>;
let actions: SolanaOrderActions | undefined;
function Probe() {
  state = useGmsolOrderTransactions();
  actions = useContext(SolanaOrderActionsContext);
  return null;
}

// The sender's own checks: sign through the adapter, then send only while the adapter still reports the owner.
function sendAfterSigning() {
  let finishSigning!: () => void;
  mocks.sign.mockReturnValue(new Promise((resolve) => (finishSigning = () => resolve(new Uint8Array()))));
  mocks.prepare.mockResolvedValue({});
  mocks.send.mockImplementation(
    async (p: { getWalletAddress: () => string | undefined; signTransaction: (bytes: Uint8Array) => unknown }) => {
      await p.signTransaction(new Uint8Array());
      if (p.getWalletAddress() !== "owner") throw new Error("Solana session changed before sending");
      return sent;
    }
  );
  return () => act(async () => finishSigning());
}

beforeEach(() => {
  i18n.load("en", {});
  i18n.activate("en");
  setAbFlagEnabled("solanaNetwork", true);
  setIsSolanaNetworkSelected(true);
  publishSolanaWalletSession({ address: "owner", signTransaction: mocks.sign });
});
afterEach(() => {
  cleanup();
  publishSolanaWalletSession(undefined);
  vi.clearAllMocks();
});

it("keeps a signed TradeBox order sending after the TradeBox remounts mid-sign FESOL-56", async () => {
  const finishSigning = sendAfterSigning();
  const view = render(
    <GmxSdkProvider>
      <Probe />
    </GmxSdkProvider>
  );
  const submission = state.acquire("owner")!;
  const result = submission.submit(action);
  await waitFor(() => expect(mocks.sign).toHaveBeenCalledTimes(1));
  view.unmount();
  render(
    <GmxSdkProvider>
      <Probe />
    </GmxSdkProvider>
  );
  expect(state.isSubmitting).toBe(true);
  await finishSigning();
  await expect(result).resolves.toBe(sent);
  act(() => submission.release());
  expect(state.isSubmitting).toBe(false);
});

it("refuses a second submission before the wallet and before any toast FESOL-56", async () => {
  const finishSigning = sendAfterSigning();
  render(
    <GmxSdkProvider>
      <GmsolOrderActionsProvider>
        <Probe />
      </GmsolOrderActionsProvider>
    </GmxSdkProvider>
  );
  const submission = state.acquire("owner")!;
  const result = submission.submit(action);
  await waitFor(() => expect(mocks.sign).toHaveBeenCalledTimes(1));
  expect(state.acquire("owner")).toBeUndefined();
  // An order this provider cannot change would show an error toast, which also closes the open order toast.
  await expect(actions!.cancelOrders([{} as OrderInfo])).resolves.toBe(false);
  expect(mocks.toast).not.toHaveBeenCalled();
  await finishSigning();
  await expect(result).resolves.toBe(sent);
  expect(mocks.prepare).toHaveBeenCalledTimes(1);
  expect(mocks.sign).toHaveBeenCalledTimes(1);
  act(() => submission.release());
});

it("drops a signed order after the wallet or the network switches away and back FESOL-56", async () => {
  for (const change of ["wallet", "network"] as const) {
    const finishSigning = sendAfterSigning();
    render(
      <GmxSdkProvider>
        <Probe />
      </GmxSdkProvider>
    );
    const submission = state.acquire("owner")!;
    const result = submission.submit(action);
    await waitFor(() => expect(mocks.sign).toHaveBeenCalledTimes(1));
    act(() => {
      if (change === "wallet") {
        publishSolanaWalletSession({ address: "other" });
        publishSolanaWalletSession({ address: "owner", signTransaction: mocks.sign });
      }
      for (const isSelected of change === "network" ? [false, true] : []) {
        setIsSolanaNetworkSelected(isSelected);
        document.dispatchEvent(new CustomEvent("networkChange", { detail: { chainId: 42161 } }));
      }
    });
    expect(state.isSubmitting).toBe(false);
    const rejected = expect(result).rejects.toThrow("Solana session changed before sending");
    await finishSigning();
    await rejected;
    cleanup();
    vi.clearAllMocks();
  }
});

it("frees the shared submitter when the wallet prompt times out TRD-72", async () => {
  let isHeldDuringSend: boolean | undefined;
  mocks.prepare.mockResolvedValue({});
  mocks.send.mockImplementationOnce(async () => {
    isHeldDuringSend = getIsGmsolOrderSubmitting();
    throw new GmsolTransactionError(new GmsolWalletPromptTimeoutError(), [], undefined);
  });
  render(
    <GmxSdkProvider>
      <GmsolOrderActionsProvider>
        <Probe />
      </GmsolOrderActionsProvider>
    </GmxSdkProvider>
  );
  const order = {
    solana: { actionState: "pending", orderAccount: "order", rentReceiver: "owner", escrowTokens: {} },
  } as unknown as OrderInfo;
  let isCancelled: boolean | undefined;
  await act(async () => {
    isCancelled = await actions!.cancelOrders([order]);
  });
  expect(isCancelled).toBe(false);
  expect(isHeldDuringSend).toBe(true);
  expect(state.isSubmitting).toBe(false);
  const next = state.acquire("owner");
  expect(next).toBeDefined();
  act(() => next!.release());
});

it("reports an order transaction that expired or failed after a confirmed setup as that setup TRD-72", async () => {
  render(
    <GmxSdkProvider>
      <Probe />
    </GmxSdkProvider>
  );
  const [setup, orders] = [1, 2].map((byte) => getBase58Decoder().decode(new Uint8Array(64).fill(byte)));
  const prepared = { confirmedSignatures: [setup], wrappedLamports: "5" };
  const failed = { err: { InstructionError: [0, { Custom: 1 }] }, confirmationStatus: "confirmed", slot: 3n };
  const rows: [Partial<PendingGmsolSubmission>, unknown, unknown[]][] = [
    [{}, null, ["failed", "expired", [], 0n]],
    [prepared, null, ["failed", "prepared", [setup], 5n]],
    [prepared, failed, ["failed", "prepared", [orders], 5n]],
    [{ ...prepared, confirmedSignatures: ["setup"] }, null, ["unknown", undefined, [orders], 0n]],
    [{ ...prepared, wrappedLamports: "5.0" }, null, ["unknown", undefined, [orders], 0n]],
    [{ confirmedSignatures: [setup] }, null, ["unknown", undefined, [orders], 0n]],
  ];
  for (const [fields, status, expected] of rows) {
    const record = { signature: orders, orderAddresses: ["order"], lastValidBlockHeight: "1", ...fields };
    setPendingGmsolSubmission("owner", { ...record, operation: "create" });
    mocks.status.mockReturnValue(status);
    const submission = state.acquire("owner")!;
    const error = await submission.submit(undefined).catch((caught: unknown) => caught);
    act(() => submission.release());
    const { submission: outcome, failure, signatures } = classifyOrderFailure(error);
    expect([outcome, failure, signatures, getPreparedWrappedLamports(error)], JSON.stringify(fields)).toEqual(expected);
  }
  setPendingGmsolSubmission("owner", undefined);
});

it("reports only the TP/SL entries whose own order confirmed TRD-72", async () => {
  render(
    <GmxSdkProvider>
      <GmsolOrderActionsProvider>
        <Probe />
      </GmsolOrderActionsProvider>
    </GmxSdkProvider>
  );
  const market = GMSOL_MARKETS.find((item) => item.longTokenAddress === WRAPPED_SOL_MINT)!;
  const position = {
    isLong: true,
    marketInfo: { ...market, tradeMath: "gmsol", isDisabled: false, indexToken: { decimals: 9 } },
    collateralToken: { address: WRAPPED_SOL_MINT },
  } as unknown as PositionInfo;
  const existingFullCloseOrder = {
    orderType: OrderType.LimitDecrease,
    indexToken: { decimals: 9 },
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    solana: { actionState: "pending", orderAccount: "old", rentReceiver: "owner", escrowTokens: {} },
  } as unknown as PositionOrderInfo;
  // "edit" updates the full-close order it replaces; "replace" creates a new order, then cancels the old one.
  const entry = (replaces?: "edit" | "replace"): SolanaTriggerEntry => ({
    amounts: {
      sizeDeltaUsd: 1n,
      collateralDeltaAmount: 0n,
      triggerPrice: 2n,
      acceptablePrice: 2n,
      triggerOrderType: OrderType.LimitDecrease,
      isFullClose: replaces !== undefined,
      decreaseSwapType:
        replaces === "replace"
          ? DecreasePositionSwapType.SwapPnlTokenToCollateralToken
          : DecreasePositionSwapType.NoSwap,
    } as DecreasePositionAmounts,
    existingFullCloseOrder: replaces ? existingFullCloseOrder : undefined,
  });
  const rows: { entries: SolanaTriggerEntry[]; confirms: boolean[]; sent: number[] }[] = [
    { entries: [entry(), entry()], confirms: [true, false], sent: [0] },
    { entries: [entry(), entry()], confirms: [false], sent: [] },
    { entries: [entry("edit"), entry()], confirms: [true, true], sent: [0, 1] },
    { entries: [entry("replace"), entry()], confirms: [true, false], sent: [0] },
    { entries: [entry("replace"), entry()], confirms: [true, true, false], sent: [0] },
    { entries: [entry(), entry("replace")], confirms: [true, true, false], sent: [0, 1] },
    { entries: [{ amounts: undefined, existingFullCloseOrder: undefined }, entry()], confirms: [true], sent: [1] },
  ];
  mocks.prepare.mockResolvedValue({});
  for (const { entries, confirms, sent: expected } of rows) {
    const queue = [...confirms];
    mocks.send.mockReset().mockImplementation(async () => {
      if (!queue.shift()) throw new Error("rejected");
      return sent;
    });
    let reported: SolanaTriggerEntry[] = [];
    await act(async () => {
      reported = await actions!.setTriggerOrders({ position, entries });
    });
    expect(mocks.send).toHaveBeenCalledTimes(confirms.length);
    expect(reported.map((item) => entries.indexOf(item))).toEqual(expected);
  }
});
