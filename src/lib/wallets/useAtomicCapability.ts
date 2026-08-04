import { useQuery } from "@tanstack/react-query";
import { getCapabilities } from "@wagmi/core";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useAccount, useConfig } from "wagmi";

import {
  consumeAtomicBatchingFallbackReason,
  disableAtomicBatchingForSession,
  getAtomicCapabilityQueryKey,
  getAtomicCapabilityStatus,
  isAtomicBatchingDisabledForSession,
  resetAtomicBatchingSessionOverride,
  subscribeToAtomicBatchingSessionOverrides,
} from "./eip5792";
import type { AtomicCapabilitySessionKey, AtomicCapabilityStatus, Eip5792Capabilities } from "./eip5792";

export function useAtomicCapability({ chainId, enabled = true }: { chainId: number; enabled?: boolean }) {
  const config = useConfig();
  const { address: account, connector } = useAccount();
  const sessionKey = useMemo<AtomicCapabilitySessionKey | undefined>(
    () =>
      account && connector
        ? {
            connectorUid: connector.uid,
            account,
            chainId,
          }
        : undefined,
    [account, chainId, connector]
  );

  const query = useQuery({
    queryKey: getAtomicCapabilityQueryKey({
      connectorUid: connector?.uid,
      account,
      chainId,
    }),
    queryFn: () => getCapabilities(config, { account, connector }),
    enabled: enabled && Boolean(account && connector),
    retry: false,
  });

  const atomicCapabilityStatus: AtomicCapabilityStatus = query.error
    ? "unknown"
    : getAtomicCapabilityStatus(query.data as Eip5792Capabilities | undefined, chainId);

  const getIsAtomicBatchingDisabled = useCallback(
    () => Boolean(sessionKey && isAtomicBatchingDisabledForSession(sessionKey)),
    [sessionKey]
  );
  const isAtomicBatchingDisabled = useSyncExternalStore(
    subscribeToAtomicBatchingSessionOverrides,
    getIsAtomicBatchingDisabled,
    getIsAtomicBatchingDisabled
  );
  const disableAtomicBatching = useCallback(() => {
    if (sessionKey) {
      disableAtomicBatchingForSession(sessionKey);
    }
  }, [sessionKey]);
  const resetAtomicBatching = useCallback(() => {
    if (sessionKey) {
      resetAtomicBatchingSessionOverride(sessionKey);
    }
  }, [sessionKey]);
  const consumeAtomicBatchingFallback = useCallback(
    () => (sessionKey ? consumeAtomicBatchingFallbackReason(sessionKey) : undefined),
    [sessionKey]
  );

  return {
    ...query,
    atomicCapabilityStatus,
    isAtomicBatchSupported:
      !isAtomicBatchingDisabled && (atomicCapabilityStatus === "supported" || atomicCapabilityStatus === "ready"),
    isAtomicBatchingDisabled,
    disableAtomicBatching,
    resetAtomicBatching,
    consumeAtomicBatchingFallbackReason: consumeAtomicBatchingFallback,
    walletProvider: connector?.name,
  };
}
