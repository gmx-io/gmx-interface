import { i18n } from "@lingui/core";
import { act, cleanup, render } from "@testing-library/react";
import { useEffect } from "react";
import { SWRConfig } from "swr";
import type { ReplacementReturnType, TransactionReceipt, WaitForTransactionReceiptParameters } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PendingTransaction, PendingTxnsContextProvider, usePendingTxns } from "./PendingTxnsContext";

const mocks = vi.hoisted(() => ({
  waitForReceipt: vi.fn(),
  getReceipt: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("lib/wallets/walletConfig", () => ({
  getPublicClientWithRpc: () => ({ waitForTransactionReceipt: mocks.waitForReceipt }),
}));
vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: 43114 }) }));
vi.mock("lib/rpc", () => ({
  getProvider: () => ({ getTransactionReceipt: mocks.getReceipt }),
  useJsonRpcProvider: () => ({ provider: { getTransactionReceipt: mocks.getReceipt } }),
}));
vi.mock("context/SettingsContext/SettingsContextProvider", () => ({ useSettings: () => ({}) }));
vi.mock("lib/helperToast", () => ({ helperToast: { error: mocks.error, success: mocks.success } }));
vi.mock("lib/errors/additionalValidation", () => ({ getCallStaticError: async () => ({}) }));
vi.mock("lib/metrics", () => ({ sendTxnErrorMetric: vi.fn() }));
vi.mock("lib/userAnalytics", () => ({ sendUserAnalyticsOrderResultEvent: vi.fn() }));
vi.mock("components/Errors/errorToasts", () => ({ getInsufficientExecutionFeeToastContent: vi.fn() }));

const watchers = new Map<
  string,
  { params: WaitForTransactionReceiptParameters; resolve: (receipt: TransactionReceipt) => void }
>();
let context: ReturnType<typeof usePendingTxns>;
const swrConfig = { provider: () => new Map(), errorRetryInterval: 10 };

function Harness({ transaction }: { transaction: PendingTransaction }) {
  context = usePendingTxns();
  useEffect(() => context.setPendingTxns([transaction]), [transaction]);
  return null;
}

function createTransaction(): PendingTransaction {
  return {
    hash: "original",
    chainId: 42161,
    message: "Created",
    onError: vi.fn(),
    onReplaced: vi.fn(),
  };
}

function mount() {
  const transaction = createTransaction();
  render(
    <SWRConfig value={swrConfig}>
      <PendingTxnsContextProvider>
        <Harness transaction={transaction} />
      </PendingTxnsContextProvider>
    </SWRConfig>
  );
  return transaction;
}

async function replace(reason: ReplacementReturnType["reason"]) {
  const replacement = {
    reason,
    transactionReceipt: { transactionHash: "replacement", status: "success" },
  } as ReplacementReturnType;
  await act(async () => {
    const watcher = watchers.get("original")!;
    watcher.params.onReplaced?.(replacement);
    watcher.resolve(replacement.transactionReceipt);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  watchers.clear();
  i18n.load("en", {});
  i18n.activate("en");
  mocks.getReceipt.mockResolvedValue(null);
  mocks.waitForReceipt.mockImplementation(
    (params: WaitForTransactionReceiptParameters) =>
      new Promise<TransactionReceipt>((resolve) => watchers.set(params.hash, { params, resolve }))
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("pending wallet transaction replacements", () => {
  it.each(["cancelled", "replaced"] as const)("clears a %s transaction without an original receipt", async (reason) => {
    const transaction = mount();
    expect(mocks.waitForReceipt).toHaveBeenCalledWith(expect.objectContaining({ hash: "original", timeout: 0 }));
    await replace(reason);
    expect(transaction.onError).toHaveBeenCalledOnce();
    expect(transaction.onReplaced).not.toHaveBeenCalled();
    expect(context.pendingTxns).toEqual([]);
    expect(mocks.error).toHaveBeenCalledOnce();
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it.each([0, 1])("follows a speed-up and handles its receipt status %s", async (status) => {
    const transaction = mount();
    await replace("repriced");
    expect(transaction.onReplaced).toHaveBeenCalledWith("replacement");
    expect(transaction.onError).not.toHaveBeenCalled();
    expect(context.pendingTxns[0].hash).toBe("replacement");

    mocks.getReceipt.mockImplementation(async (hash) => (hash === "replacement" ? { status } : null));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(context.pendingTxns).toEqual([]);
    expect(transaction.onError).toHaveBeenCalledTimes(status === 0 ? 1 : 0);
    expect(mocks.success).toHaveBeenCalledTimes(status);
  });

  it("retries an RPC failure without clearing the pending batch", async () => {
    mocks.waitForReceipt.mockRejectedValueOnce(new Error("RPC unavailable"));
    const transaction = mount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(mocks.waitForReceipt.mock.calls.length).toBeGreaterThan(1);
    expect(context.pendingTxns).toHaveLength(1);
    expect(transaction.onError).not.toHaveBeenCalled();
    await replace("cancelled");
    expect(context.pendingTxns).toEqual([]);
  });

  it("does not restore a cancelled transaction when an older receipt poll completes", async () => {
    mount();
    const other = { hash: "other", message: "Other" };
    act(() => context.setPendingTxns((txns) => [...txns, other]));
    let resolveOriginal: (receipt: null) => void;
    mocks.getReceipt.mockImplementation((hash) =>
      hash === "original"
        ? new Promise((resolve) => {
            resolveOriginal = resolve;
          })
        : Promise.resolve({ status: 1 })
    );
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    await replace("cancelled");
    const newer = { hash: "newer", message: "Newer" };
    act(() => context.setPendingTxns((txns) => [...txns, newer]));
    await act(async () => {
      resolveOriginal(null);
    });
    expect(context.pendingTxns).toEqual([newer]);
  });
});
