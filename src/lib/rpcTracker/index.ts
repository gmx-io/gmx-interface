import {
  getCurrentRpcUrls as old_getCurrentRpcUrls,
  useCurrentRpcUrls as old_useCurrentRpcUrls,
} from "ab/testRpcFallbackUpdates/disabled/oldRpcTracker";
import { useEffect, useState } from "react";

import { getIsFlagEnabled } from "config/ab";
import { CONTRACTS_CHAIN_IDS, ContractsChainId } from "config/chains";
import { getRpcProviders } from "config/rpc";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";

import { DEFAULT_RPC_TRACKER_CONFIG, RpcTracker } from "./RpcTracker";

const RPC_TRACKER_UPDATE_EVENT = "rpc-tracker-update-event";

// Create singleton instances
const rpcTrackerInstances = CONTRACTS_CHAIN_IDS.reduce(
  (acc, chainId) => {
    acc[chainId] = new RpcTracker({ ...DEFAULT_RPC_TRACKER_CONFIG, chainId });
    return acc;
  },
  {} as Record<number, RpcTracker>
);

function getRpcTracker(chainId: number): RpcTracker | undefined {
  return rpcTrackerInstances[chainId as ContractsChainId];
}

// Initialize tracking if flag is enabled
if (getIsFlagEnabled("testRpcFallbackUpdates")) {
  Object.values(rpcTrackerInstances).forEach((tracker) => tracker.track({ warmUp: true }));
}

// Export wrapper functions that match the original API
function _getCurrentRpcUrls(chainId: number) {
  const defaultRpcProviders = getRpcProviders(chainId, "default");
  const privateRpcProviders = getIsLargeAccount()
    ? getRpcProviders(chainId, "largeAccount")
    : getRpcProviders(chainId, "fallback");

  let primary = defaultRpcProviders?.[0]?.url;
  let secondary = privateRpcProviders?.[0]?.url ?? primary ?? "";

  if (!primary) {
    throw new Error(`No RPC providers found for chainId: ${chainId}`);
  }

  const tracker = getRpcTracker(chainId);

  return tracker?.getCurrentRpcUrls() ?? { primary, secondary };
}

function _useCurrentRpcUrls(chainId: number) {
  const [bestRpcUrls, setBestRpcUrls] = useState<{
    primary: string;
    secondary: string;
  }>(() => _getCurrentRpcUrls(chainId));

  useEffect(() => {
    let isMounted = true;

    setBestRpcUrls(_getCurrentRpcUrls(chainId));

    const handleRpcUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ chainId?: number }>;
      // TODO: Remove after AB.
      // Update if:
      // 1. Event has chainId and it matches this chain, OR
      // 2. Event doesn't have chainId (legacy event - update for all chains)
      const shouldUpdate =
        isMounted && (customEvent.detail?.chainId === undefined || customEvent.detail?.chainId === chainId);

      if (shouldUpdate) {
        setBestRpcUrls(_getCurrentRpcUrls(chainId));
      }
    };

    window.addEventListener(RPC_TRACKER_UPDATE_EVENT, handleRpcUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener(RPC_TRACKER_UPDATE_EVENT, handleRpcUpdate);
    };
  }, [chainId]);

  return bestRpcUrls;
}

async function _banRpcUrl(chainId: number, failedRpcUrl: string, reason?: string) {
  const tracker = getRpcTracker(chainId);
  if (!tracker) {
    return;
  }

  tracker.banProvider(failedRpcUrl, reason || "Provider marked as failed");
}

export const useCurrentRpcUrls = getIsFlagEnabled("testRpcFallbackUpdates")
  ? _useCurrentRpcUrls
  : old_useCurrentRpcUrls;

export const getCurrentRpcUrls = getIsFlagEnabled("testRpcFallbackUpdates")
  ? _getCurrentRpcUrls
  : old_getCurrentRpcUrls;

export const banRpcUrl = getIsFlagEnabled("testRpcFallbackUpdates") ? _banRpcUrl : async () => null;

// Re-export RpcTracker and related types
export { RpcTracker, DEFAULT_RPC_TRACKER_CONFIG } from "./RpcTracker";
export type { ProbeData, ProbeStats, RpcProviderState, RpcTrackerConfig, RpcTrackerState } from "./types";
