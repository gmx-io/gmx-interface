import { getAccount, getCallsStatus, sendCalls } from "@wagmi/core";
import {
  AtomicityNotSupportedError,
  AtomicReadyWalletRejectedUpgradeError,
  BundleTooLargeError,
  MethodNotFoundRpcError,
  MethodNotSupportedRpcError,
  UnsupportedChainIdError,
  UnsupportedNonOptionalCapabilityError,
  UnsupportedProviderMethodError,
  UserRejectedRequestError,
  type Address,
  type Hex,
} from "viem";

import { getPendingWalletBatchKey } from "config/localStorage";
import { extendError } from "lib/errors";
import { WALLET_BATCH_CONFIRMED_LATE_ERROR, WALLET_BATCH_PENDING_ERROR } from "lib/errors/customErrors";
import { readLocalStorageItem, removeLocalStorageItem, writeLocalStorageItem } from "lib/localStorage";
import { metrics, type WalletBatchEvent, type WalletBatchOutcome } from "lib/metrics";
import { sleep } from "lib/sleep";
import { disableWalletBatchingForSession, getWalletBatchingSessionKey } from "lib/wallets/walletBatchingSession";
import { getWagmiConfig } from "lib/wallets/walletConfig";
import { withFallback } from "lib/withFallback";

export type WalletCall = {
  to: Address;
  data: Hex;
  value?: bigint;
};

/** Calls that go in the same wallet confirmation as the action, before it */
export type WalletCallsBatch = {
  calls: WalletCall[];
  flow: string;
  atomicStatus: string | undefined;
  onOutcome?: (outcome: WalletBatchOutcome, error?: unknown) => void;
};

// long enough for a slow bundler, short enough to free a stuck submit button
const CALLS_STATUS_TIMEOUT_MS = 180_000;
const CALLS_STATUS_POLL_INTERVAL_MS = 1_000;
// a batch no wallet can report on after this long is no longer worth holding its flow for
const PENDING_BATCH_MAX_AGE_MS = 30 * 60 * 1000;
const PENDING_BATCH_STATUS_TIMEOUT_MS = 10_000;

type PendingWalletBatch = {
  id: string;
  flow: string;
  connectorId: string | undefined;
  sentAt: number;
  callsCount: number;
  atomicStatus: string | undefined;
};

const UNSUPPORTED_ERROR_CODES: number[] = [
  AtomicityNotSupportedError.code,
  UnsupportedNonOptionalCapabilityError.code,
  UnsupportedChainIdError.code,
  BundleTooLargeError.code,
  MethodNotFoundRpcError.code,
  MethodNotSupportedRpcError.code,
  UnsupportedProviderMethodError.code,
];

export async function sendWalletCalls({
  chainId,
  account,
  calls,
  batch,
}: {
  chainId: number;
  account: string;
  calls: WalletCall[];
  batch: WalletCallsBatch;
}): Promise<{ transactionHash: Hex }> {
  const config = getWagmiConfig();
  const { connector } = getAccount(config);
  const sessionKey = connector
    ? getWalletBatchingSessionKey({ connectorUid: connector.uid, account, chainId })
    : undefined;

  const report = (outcome: WalletBatchOutcome, error?: unknown) => {
    reportWalletBatch(
      { chainId, flow: batch.flow, callsCount: calls.length, atomicStatus: batch.atomicStatus },
      outcome,
      error
    );
    batch.onOutcome?.(outcome, error);
  };

  let id: string;

  try {
    ({ id } = await sendCalls(config, {
      account: account as Address,
      calls,
      chainId: chainId as (typeof config.chains)[number]["id"],
      connector,
      forceAtomic: true,
    }));
  } catch (error) {
    report(getSendFailureOutcome(error), error);

    // whatever went wrong, the next attempt goes through the step-by-step flow instead of the same prompt
    if (sessionKey) {
      disableWalletBatchingForSession(sessionKey);
    }

    throw extendError(error, { errorContext: "sending" });
  }

  addPendingWalletBatch(
    { chainId, account },
    {
      id,
      flow: batch.flow,
      connectorId: connector?.id,
      sentAt: Date.now(),
      callsCount: calls.length,
      atomicStatus: batch.atomicStatus,
    }
  );
  report("sent");

  let status: Awaited<ReturnType<typeof getCallsStatus>> | undefined;
  let statusError: unknown;
  const deadline = Date.now() + CALLS_STATUS_TIMEOUT_MS;

  while (status === undefined && Date.now() < deadline) {
    // a single request can hang or fail while the batch is still on its way, so neither ends the wait
    const nextStatus = await withFallback(
      getCallsStatus(config, { id, connector }).catch((error) => {
        statusError = error;
        return undefined;
      }),
      undefined,
      deadline - Date.now()
    );

    if (nextStatus !== undefined && nextStatus.status !== "pending" && nextStatus.status !== undefined) {
      status = nextStatus;
      break;
    }

    await sleep(CALLS_STATUS_POLL_INTERVAL_MS);
  }

  if (status === undefined) {
    // the batch can still land, so it stays pending and the next transaction waits for its result
    const error = Object.assign(new Error(WALLET_BATCH_PENDING_ERROR), { cause: statusError });
    report("statusUnknown", error);
    throw extendError(error, { errorContext: "sending" });
  }

  removePendingWalletBatch({ chainId, account }, id);

  const transactionHash = status.receipts?.at(-1)?.transactionHash;

  if (status.status !== "success" || !transactionHash) {
    const error = new Error("Wallet call bundle failed");
    report("failed", error);
    throw extendError(error, { errorContext: "sending", data: { transactionHash, statusCode: status.statusCode } });
  }

  report("confirmed");

  return { transactionHash };
}

/**
 * Stops a send of `flow` while a batch of that flow the wallet accepted may still land, so a retry after a status
 * timeout doesn't spend twice. Every send that spends what the flow's batch spent passes it as `batchFlow`, batched or
 * not; closes and cancels can't repeat that spend and pass none.
 */
export async function assertNoPendingWalletBatch({
  chainId,
  account,
  flow,
}: {
  chainId: number;
  account: string;
  flow: string;
}) {
  const target = { chainId, account };

  for (const pending of getPendingWalletBatches(target).filter((batch) => batch.flow === flow)) {
    const status = await getPendingWalletBatchStatus(pending);

    if (status === "success") {
      removePendingWalletBatch(target, pending.id);
      reportWalletBatch({ chainId, ...pending }, "confirmedLate");
      // this send is most likely the retry, so it stops once to say the first one went through
      throw extendError(new Error(WALLET_BATCH_CONFIRMED_LATE_ERROR), { errorContext: "pendingWalletBatch" });
    }

    if (status === "failure") {
      removePendingWalletBatch(target, pending.id);
      reportWalletBatch({ chainId, ...pending }, "failedLate");
      continue;
    }

    if (status === undefined && Date.now() - pending.sentAt > PENDING_BATCH_MAX_AGE_MS) {
      removePendingWalletBatch(target, pending.id);
      continue;
    }

    throw extendError(new Error(WALLET_BATCH_PENDING_ERROR), { errorContext: "pendingWalletBatch" });
  }
}

async function getPendingWalletBatchStatus(pending: PendingWalletBatch) {
  const config = getWagmiConfig();
  const { connector } = getAccount(config);

  // another wallet app can't report the batch; WalletConnect apps share one connector id and answer "unknown bundle"
  if (connector === undefined || connector.id !== pending.connectorId) {
    return undefined;
  }

  const result = await withFallback(
    getCallsStatus(config, { id: pending.id, connector }).catch(() => undefined),
    undefined,
    PENDING_BATCH_STATUS_TIMEOUT_MS
  );

  return result?.status;
}

function reportWalletBatch(
  {
    chainId,
    flow,
    callsCount,
    atomicStatus,
  }: Pick<PendingWalletBatch, "flow" | "callsCount" | "atomicStatus"> & {
    chainId: number;
  },
  outcome: WalletBatchOutcome,
  error?: unknown
) {
  metrics.pushEvent<WalletBatchEvent>({
    event: "walletBatch",
    isError: false,
    data: {
      outcome,
      flow,
      chainId,
      callsCount,
      atomicStatus,
      errorCode: error !== undefined ? getErrorCode(error) : undefined,
    },
  });
}

function getPendingWalletBatches({ chainId, account }: { chainId: number; account: string }) {
  return (
    readLocalStorageItem(getPendingWalletBatchKey(chainId, account), {
      deserializer: (value) => {
        const batches: unknown = JSON.parse(value);
        return Array.isArray(batches) ? (batches as PendingWalletBatch[]) : undefined;
      },
    }) ?? []
  );
}

// several tabs can each wait for their own batch, so a record is added and removed by its id
function addPendingWalletBatch(target: { chainId: number; account: string }, batch: PendingWalletBatch) {
  writePendingWalletBatches(target, [...getPendingWalletBatches(target).filter(({ id }) => id !== batch.id), batch]);
}

function removePendingWalletBatch(target: { chainId: number; account: string }, id: string) {
  writePendingWalletBatches(
    target,
    getPendingWalletBatches(target).filter((batch) => batch.id !== id)
  );
}

function writePendingWalletBatches(
  { chainId, account }: { chainId: number; account: string },
  batches: PendingWalletBatch[]
) {
  const key = getPendingWalletBatchKey(chainId, account);

  if (batches.length > 0) {
    writeLocalStorageItem(key, batches, { serializer: JSON.stringify });
  } else {
    removeLocalStorageItem(key);
  }
}

function getSendFailureOutcome(error: unknown): WalletBatchOutcome {
  const code = getErrorCode(error);

  if (code === AtomicReadyWalletRejectedUpgradeError.code) {
    return "upgradeRejected";
  }

  if (code === UserRejectedRequestError.code) {
    return "rejected";
  }

  if (code !== undefined && UNSUPPORTED_ERROR_CODES.includes(code)) {
    return "unsupported";
  }

  return "failed";
}

// viem wraps provider errors, the RPC code can be several causes deep
function getErrorCode(error: unknown): number | undefined {
  const seen = new Set<unknown>();

  while (error && typeof error === "object" && !seen.has(error)) {
    seen.add(error);

    if ("code" in error && typeof error.code === "number") {
      return error.code;
    }

    error = "cause" in error ? error.cause : undefined;
  }

  return undefined;
}
