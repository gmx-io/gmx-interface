import { i18n } from "@lingui/core";
import { act, cleanup, render } from "@testing-library/react";
import { useEffect } from "react";
import { SWRConfig } from "swr";
import {
  TransactionReceiptNotFoundError,
  type Client,
  type ReplacementReturnType,
  type TransactionReceipt,
  type WaitForTransactionReceiptParameters,
  type WatchBlockNumberParameters,
} from "viem";
import { waitForTransactionReceipt } from "viem/actions";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PendingTransaction, PendingTxnsContextProvider, usePendingTxns } from "./PendingTxnsContext";

const mocks = vi.hoisted(() => ({
  waitForReceipt: vi.fn(),
  getReceipt: vi.fn(),
  getProvider: vi.fn(),
  getPublicClient: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("lib/wallets/walletConfig", () => ({
  getPublicClientWithRpc: mocks.getPublicClient,
}));
vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: 43114 }) }));
vi.mock("lib/rpc", () => ({
  getProvider: mocks.getProvider,
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
const swrConfig = { provider: () => new Map() };

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
  mocks.getProvider.mockReturnValue({ getTransactionReceipt: mocks.getReceipt });
  mocks.getPublicClient.mockReturnValue({ waitForTransactionReceipt: mocks.waitForReceipt });
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
  it.each([0, 1])("settles a speed-up on its submitted chain with receipt status %s", async (status) => {
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
    expect(mocks.getPublicClient).toHaveBeenCalledWith(42161);
    expect(mocks.getProvider).toHaveBeenCalledWith(undefined, 42161);
  });

  it("retries receipt polling failures without losing the pending transaction", async () => {
    const transaction = mount();
    mocks.getReceipt.mockRejectedValueOnce(new Error("RPC unavailable")).mockResolvedValue({ status: 0 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(context.pendingTxns).toHaveLength(1);
    expect(transaction.onError).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(context.pendingTxns).toEqual([]);
    expect(transaction.onError).toHaveBeenCalledOnce();
  });

  it("does not overlap slow receipt polls", async () => {
    const transaction = mount();
    let resolveReceipt: (receipt: { status: number }) => void;
    mocks.getReceipt.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReceipt = resolve;
        })
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(mocks.getReceipt).toHaveBeenCalledOnce();
    await act(async () => {
      resolveReceipt({ status: 0 });
    });
    expect(transaction.onError).toHaveBeenCalledOnce();
    expect(mocks.error).toHaveBeenCalledOnce();
    expect(context.pendingTxns).toEqual([]);
  });

  it.each([0, 1])("ignores stale receipt status %s after cancellation", async (status) => {
    const transaction = mount();
    let resolveReceipt: (receipt: { status: number }) => void;
    mocks.getReceipt.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReceipt = resolve;
        })
    );
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    await replace("cancelled");
    await act(async () => {
      resolveReceipt({ status });
    });
    expect(transaction.onError).toHaveBeenCalledOnce();
    expect(mocks.error).toHaveBeenCalledOnce();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(context.pendingTxns).toEqual([]);
  });

  it("ignores a replacement callback for a transaction that was already removed", async () => {
    const transaction = mount();
    act(() => context.setPendingTxns([]));
    await replace("cancelled");
    expect(transaction.onError).not.toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("ignores replacement callbacks after the provider unmounts", async () => {
    const transaction = mount();
    cleanup();
    await replace("cancelled");
    expect(transaction.onError).not.toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it.each(["cancelled", "replaced"] as const)(
    "clears a mined %s transaction through viem's replacement matching",
    async (reason) => {
      const from = "0x1111111111111111111111111111111111111111";
      const original = {
        hash: "original",
        from,
        to: "0x2222222222222222222222222222222222222222",
        nonce: 1,
        value: 1n,
        input: "0x1234",
      };
      const replacement = {
        ...original,
        hash: "replacement",
        to: reason === "cancelled" ? from : "0x3333333333333333333333333333333333333333",
        value: 0n,
        input: "0x",
      };
      let notifyBlock: WatchBlockNumberParameters["onBlockNumber"];
      const client = {
        uid: `pending-${reason}-test`,
        getTransactionReceipt: async ({ hash }: { hash: string }) => {
          if (hash === "original") throw new TransactionReceiptNotFoundError({ hash: hash as `0x${string}` });
          return { transactionHash: hash, status: "success", blockNumber: 1n };
        },
        getTransaction: async () => original,
        getBlock: async () => ({ transactions: [replacement] }),
        watchBlockNumber: ({ onBlockNumber }: WatchBlockNumberParameters) => {
          notifyBlock = onBlockNumber;
          return () => undefined;
        },
      };
      mocks.waitForReceipt.mockImplementation((params: WaitForTransactionReceiptParameters) =>
        waitForTransactionReceipt(client as unknown as Client, params)
      );
      const transaction = mount();
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await notifyBlock(1n, undefined);
      });
      expect(transaction.onError).toHaveBeenCalledOnce();
      expect(transaction.onReplaced).not.toHaveBeenCalled();
      expect(context.pendingTxns).toEqual([]);
      expect(mocks.error).toHaveBeenCalledOnce();
      expect(mocks.success).not.toHaveBeenCalled();
    }
  );

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
