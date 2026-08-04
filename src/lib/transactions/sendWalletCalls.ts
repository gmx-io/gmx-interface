import { getAccount, getCallsStatus, sendCalls, waitForCallsStatus } from "@wagmi/core";
import type { Address, Hex } from "viem";

import { parseError } from "lib/errors";
import { pushBatchApprovalAnalyticsEvent } from "lib/userAnalytics/batchApprovalAnalytics";
import type { BatchApprovalAnalyticsEventParams } from "lib/userAnalytics/batchApprovalAnalytics";
import type { TokenApproveBatchReason } from "lib/userAnalytics/types";
import { disableAtomicBatchingForSession } from "lib/wallets/eip5792";
import { getWagmiConfig } from "lib/wallets/walletConfig";

export type WalletCall = {
  to: Address;
  data?: Hex;
  value?: bigint;
};

export type WalletCallsStatus = Awaited<ReturnType<typeof getCallsStatus>>;

export type WalletCallsAnalyticsContext = Omit<BatchApprovalAnalyticsEventParams, "action" | "reason">;

export type SendWalletCallsResult = {
  id: string;
  getStatus: () => Promise<WalletCallsStatus>;
  wait: (timeout?: number) => Promise<WalletCallsStatus>;
};

export class AtomicWalletCallsRequiredError extends Error {
  constructor() {
    super("Wallet call bundle was not executed atomically");
    this.name = "AtomicWalletCallsRequiredError";
  }
}

function getBatchApprovalFailureReason(error: unknown): TokenApproveBatchReason {
  let currentError = error;

  for (let index = 0; index < 10 && currentError && typeof currentError === "object"; index++) {
    const errorName = (currentError as { name?: string }).name;
    const errorCode = (currentError as { code?: number }).code;

    if (errorName === "AtomicReadyWalletRejectedUpgradeError" || errorCode === 5750) {
      return "UpgradeRejected";
    }

    if (
      errorName === "AtomicityNotSupportedError" ||
      errorName === "MethodNotFoundRpcError" ||
      errorName === "MethodNotSupportedRpcError" ||
      errorName === "UnsupportedProviderMethodError" ||
      errorCode === 5760 ||
      errorCode === 4200 ||
      errorCode === -32601
    ) {
      return "AtomicUnsupported";
    }

    if (errorCode === 4001) {
      return "UserRejected";
    }

    currentError = (currentError as { cause?: unknown }).cause;
  }

  if (parseError(error as Error)?.isUserRejectedError) {
    return "UserRejected";
  }

  return "SendFailed";
}

export async function sendWalletCalls({
  chainId,
  account,
  calls,
  analytics,
}: {
  chainId: number;
  account: Address;
  calls: WalletCall[];
  analytics?: WalletCallsAnalyticsContext;
}): Promise<SendWalletCallsResult> {
  const config = getWagmiConfig();
  const connector = getAccount(config).connector;
  const sessionKey = connector
    ? {
        connectorUid: connector.uid,
        account,
        chainId,
      }
    : undefined;

  const pushAnalytics = (action: BatchApprovalAnalyticsEventParams["action"], reason?: TokenApproveBatchReason) => {
    if (!analytics) return;

    void pushBatchApprovalAnalyticsEvent({
      ...analytics,
      action,
      reason,
    });
  };

  pushAnalytics("BatchApproveAttempt");

  let id: string;

  try {
    const result = await sendCalls(config, {
      account,
      calls,
      chainId: chainId as (typeof config.chains)[number]["id"],
      connector,
      forceAtomic: true,
    });
    id = result.id;
  } catch (error) {
    const reason = getBatchApprovalFailureReason(error);
    pushAnalytics("BatchApproveFail", reason);

    if (sessionKey) {
      disableAtomicBatchingForSession(sessionKey, reason);
    }

    throw error;
  }

  pushAnalytics("BatchApproveSubmitted");

  let isTerminalStatusTracked = false;
  let isUnknownStatusTracked = false;

  const trackStatus = (status: WalletCallsStatus) => {
    if (isTerminalStatusTracked || status.status === "pending" || status.status === undefined) {
      return;
    }

    isTerminalStatusTracked = true;

    if (status.status === "success" && status.atomic) {
      pushAnalytics("BatchApproveSuccess");
      return;
    }

    const reason = status.status === "success" ? "AtomicUnsupported" : "BundleFailed";
    pushAnalytics("BatchApproveFail", reason);

    if (sessionKey) {
      disableAtomicBatchingForSession(sessionKey, reason);
    }
  };

  const assertAtomicStatus = (status: WalletCallsStatus) => {
    if (status.status === "success" && !status.atomic) {
      throw new AtomicWalletCallsRequiredError();
    }

    return status;
  };

  const getStatus = async () => {
    const status = await getCallsStatus(config, { id, connector });
    trackStatus(status);
    return status;
  };

  const wait = async (timeout = 60_000) => {
    try {
      const status = await waitForCallsStatus(config, {
        id,
        connector,
        timeout,
      });
      trackStatus(status);
      return assertAtomicStatus(status);
    } catch (error) {
      if ((error as { name?: string }).name === "WaitForCallsStatusTimeoutError" && !isUnknownStatusTracked) {
        isUnknownStatusTracked = true;
        pushAnalytics("BatchApproveStatusUnknown", "StatusTimeout");
      }

      throw error;
    }
  };

  return {
    id,
    getStatus,
    wait,
  };
}
