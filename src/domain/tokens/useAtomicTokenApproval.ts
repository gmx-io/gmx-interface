import { useCallback, useMemo, useRef, useState } from "react";
import type { Address } from "viem";

import { sendWalletCalls } from "lib/transactions/sendWalletCalls";
import type { WalletCallsAnalyticsContext } from "lib/transactions/sendWalletCalls";
import { pushBatchApprovalAnalyticsEvent } from "lib/userAnalytics/batchApprovalAnalytics";
import type { TokenApproveBatchReason, TokenApproveBatchSource } from "lib/userAnalytics/types";
import { useAtomicCapability } from "lib/wallets/useAtomicCapability";
import useWallet from "lib/wallets/useWallet";

import { buildTokenApprovalCall } from "./tokenApproval";
import type { PendingTokenApproval } from "./tokenApproval";

export function useAtomicTokenApproval({
  chainId,
  spenderAddress,
  pendingTokenApprovals,
  source,
  enabled = true,
  minApprovalCount = 2,
}: {
  chainId: number | undefined;
  spenderAddress: string | undefined;
  pendingTokenApprovals: PendingTokenApproval[];
  source: TokenApproveBatchSource;
  enabled?: boolean;
  minApprovalCount?: number;
}) {
  const { account } = useWallet();
  const [isBatchApproving, setIsBatchApproving] = useState(false);
  const isBatchApprovingRef = useRef(false);
  const atomicCapability = useAtomicCapability({
    chainId: chainId ?? 0,
    enabled: enabled && chainId !== undefined,
  });

  const approvalCalls = useMemo(
    () =>
      spenderAddress
        ? pendingTokenApprovals.map(({ tokenAddress }) =>
            buildTokenApprovalCall({
              tokenAddress,
              spender: spenderAddress,
            })
          )
        : [],
    [pendingTokenApprovals, spenderAddress]
  );

  const analyticsContext = useMemo<WalletCallsAnalyticsContext | undefined>(
    () =>
      chainId !== undefined
        ? {
            source,
            chainId,
            capabilityStatus: atomicCapability.atomicCapabilityStatus,
            tokenCount: approvalCalls.length,
            walletProvider: atomicCapability.walletProvider,
          }
        : undefined,
    [approvalCalls.length, atomicCapability.atomicCapabilityStatus, atomicCapability.walletProvider, chainId, source]
  );

  const trackFallback = useCallback(
    (reason: TokenApproveBatchReason) => {
      if (!analyticsContext) return;

      void pushBatchApprovalAnalyticsEvent({
        ...analyticsContext,
        action: "BatchApproveFallback",
        reason,
      });
    },
    [analyticsContext]
  );
  const trackSessionFallback = useCallback(() => {
    const reason = atomicCapability.consumeAtomicBatchingFallbackReason();

    if (reason) {
      trackFallback(reason);
    }
  }, [atomicCapability, trackFallback]);

  const submitBatch = useCallback(async () => {
    if (
      isBatchApprovingRef.current ||
      !account ||
      !chainId ||
      !analyticsContext ||
      approvalCalls.length < minApprovalCount
    ) {
      return false;
    }

    isBatchApprovingRef.current = true;
    setIsBatchApproving(true);

    let result: Awaited<ReturnType<typeof sendWalletCalls>> | undefined;
    let isWaitingInBackground = false;

    try {
      result = await sendWalletCalls({
        chainId,
        account: account as Address,
        calls: approvalCalls,
        analytics: analyticsContext,
      });

      const status = await result.wait();
      return status.status === "success" && status.atomic;
    } catch (error) {
      if ((error as { name?: string }).name === "WaitForCallsStatusTimeoutError" && result) {
        isWaitingInBackground = true;
        void result
          .wait(0)
          .catch(() => undefined)
          .finally(() => {
            isBatchApprovingRef.current = false;
            setIsBatchApproving(false);
          });
        return false;
      }

      return false;
    } finally {
      if (!isWaitingInBackground) {
        isBatchApprovingRef.current = false;
        setIsBatchApproving(false);
      }
    }
  }, [account, analyticsContext, approvalCalls, chainId, minApprovalCount]);

  const fallbackReason: TokenApproveBatchReason =
    atomicCapability.atomicCapabilityStatus === "unsupported" ? "CapabilityUnsupported" : "CapabilityQueryFailed";

  return {
    approvalCalls,
    analyticsContext,
    atomicCapabilityStatus: atomicCapability.atomicCapabilityStatus,
    canBatch:
      enabled &&
      atomicCapability.isAtomicBatchSupported &&
      approvalCalls.length >= minApprovalCount &&
      Boolean(account && chainId),
    fallbackReason,
    isBatchApproving,
    isCapabilityLoading: atomicCapability.isPending,
    isAtomicBatchingDisabled: atomicCapability.isAtomicBatchingDisabled,
    submitBatch,
    trackFallback,
    trackSessionFallback,
  };
}
