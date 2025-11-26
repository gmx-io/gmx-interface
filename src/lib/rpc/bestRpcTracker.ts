import { useEffect, useState } from "react";

import {
  getCurrentRpcUrls as old_getCurrentRpcUrls,
  useCurrentRpcUrls as old_useCurrentRpcUrls,
  trackRpcProviders as old_trackRpcProviders,
  RPC_TRACKER_UPDATE_EVENT,
} from "ab/testRpcFallbackUpdates/disabled/oldRpcTracker";
import { getIsFlagEnabled } from "config/ab";
import { CONTRACTS_CHAIN_IDS, ContractsChainId } from "config/chains";
import { getRpcProviders } from "config/rpc";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { onFallbackTracker } from "lib/FallbackTracker/events";
import { DEFAULT_RPC_TRACKER_CONFIG, RpcTracker } from "lib/rpc/RpcTracker";

type UpdateEndpointsListener = (data: { chainId?: number }) => void;

const updateEndpointsListeners = new Set<UpdateEndpointsListener>();

// Map trackerKey to chainId for event handling
const trackerKeyToChainId = new Map<string, number>();

// Create singleton instances
const rpcTrackerInstances = CONTRACTS_CHAIN_IDS.reduce(
  (acc, chainId) => {
    const tracker = new RpcTracker({
      ...DEFAULT_RPC_TRACKER_CONFIG,
      chainId: chainId as ContractsChainId,
    });
    acc[chainId] = tracker;
    // Map trackerKey to chainId
    trackerKeyToChainId.set(tracker.trackerKey, chainId);
    return acc;
  },
  {} as Record<number, RpcTracker>
);

// Subscribe to FallbackTracker events and emit to local listeners
if (typeof window !== "undefined") {
  onFallbackTracker("endpointsUpdated", ({ trackerKey }) => {
    const chainId = trackerKeyToChainId.get(trackerKey);
    if (chainId !== undefined) {
      updateEndpointsListeners.forEach((listener) => {
        try {
          listener({ chainId });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("[bestRpcTracker] Error in updateEndpoints listener:", error);
        }
      });
    }
  });
}

export function getRpcTracker(chainId: number): RpcTracker | undefined {
  return rpcTrackerInstances[chainId as ContractsChainId];
}

// Initialize tracking if flag is enabled
if (getIsFlagEnabled("testRpcFallbackUpdates")) {
  Object.values(rpcTrackerInstances).forEach((tracker) => tracker.fallbackTracker.track({ warmUp: true }));
} else {
  old_trackRpcProviders({ warmUp: true });
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

  if (tracker) {
    return tracker.pickCurrentRpcUrls();
  }

  return { primary, secondary, trackerKey: "unknown" };
}

function _useCurrentRpcUrls(chainId: number) {
  const [bestRpcUrls, setBestRpcUrls] = useState<{
    primary: string;
    secondary: string;
  }>(() => _getCurrentRpcUrls(chainId));

  useEffect(() => {
    const tracker = getRpcTracker(chainId);
    let isMounted = true;

    setBestRpcUrls(_getCurrentRpcUrls(chainId));

    const oldHandleRpcUpdate = (data: { chainId: number }) => {
      if (!isMounted) {
        return;
      }

      setBestRpcUrls(_getCurrentRpcUrls(data.chainId));
    };

    const handleRpcUpdate = (data: { trackerKey: string; primary: string; secondary: string }) => {
      if (!isMounted) {
        return;
      }

      if (tracker?.trackerKey !== data.trackerKey) {
        return;
      }

      setBestRpcUrls({
        primary: data.primary,
        secondary: data.secondary,
      });
    };

    const unsubscribe = onFallbackTracker("endpointsUpdated", handleRpcUpdate);
    window.addEventListener(RPC_TRACKER_UPDATE_EVENT as any, oldHandleRpcUpdate);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener(RPC_TRACKER_UPDATE_EVENT as any, oldHandleRpcUpdate);
    };
  }, [chainId]);

  return bestRpcUrls;
}

async function _markFailedRpcProvider(chainId: number, failedRpcUrl: string) {
  const tracker = getRpcTracker(chainId);
  if (!tracker) {
    return;
  }

  tracker.fallbackTracker.reportFailure(failedRpcUrl);
}

export const useCurrentRpcUrls = getIsFlagEnabled("testRpcFallbackUpdates")
  ? _useCurrentRpcUrls
  : old_useCurrentRpcUrls;

export const getCurrentRpcUrls = getIsFlagEnabled("testRpcFallbackUpdates")
  ? _getCurrentRpcUrls
  : old_getCurrentRpcUrls;

export const markFailedRpcProvider = getIsFlagEnabled("testRpcFallbackUpdates")
  ? _markFailedRpcProvider
  : async () => null;
