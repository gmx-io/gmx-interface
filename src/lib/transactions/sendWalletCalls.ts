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

import { extendError } from "lib/errors";
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
    metrics.pushEvent<WalletBatchEvent>({
      event: "walletBatch",
      isError: false,
      data: {
        outcome,
        flow: batch.flow,
        chainId,
        callsCount: calls.length,
        atomicStatus: batch.atomicStatus,
        errorCode: error !== undefined ? getErrorCode(error) : undefined,
      },
    });
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
    const error = Object.assign(new Error("The wallet sent the batch but didn't report its result"), {
      cause: statusError,
    });
    report("statusUnknown", error);
    throw extendError(error, { errorContext: "sending" });
  }

  const transactionHash = status.receipts?.at(-1)?.transactionHash;

  if (status.status !== "success" || !transactionHash) {
    const error = new Error("Wallet call bundle failed");
    report("failed", error);
    throw extendError(error, { errorContext: "sending", data: { transactionHash, statusCode: status.statusCode } });
  }

  report("confirmed");

  return { transactionHash };
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
