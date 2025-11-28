import { useEffect, useState } from "react";

import {
  getCurrentRpcUrls as old_getCurrentRpcUrls,
  trackRpcProviders as old_trackRpcProviders,
  useCurrentRpcUrls as old_useCurrentRpcUrls,
} from "ab/testRpcFallbackUpdates/disabled/oldRpcTracker";
import { getIsFlagEnabled } from "config/ab";
import { CONTRACTS_CHAIN_IDS, ContractsChainId, isContractsChain, SOURCE_CHAIN_IDS } from "config/chains";
import {
  getExpressRpcUrl,
  getRpcProviders,
  RPC_TRACKER_CONFIG_FOR_CONTRACTS_CHAINS,
  RPC_TRACKER_CONFIG_FOR_SOURCE_CHAINS,
} from "config/rpc";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { addFallbackTrackerListenner } from "lib/FallbackTracker/events";
import { subscribeForRpcTrackerMetrics } from "lib/metrics/rpcTrackerMetrics";
import { RpcTracker } from "lib/rpc/RpcTracker";

import { _debugRpcTracker } from "./_debug";

const RPC_TRACKERS_BY_KEY = {};
const RPC_TRACKER_KEYS_BY_CHAIN_ID = {};
let isInitialized = false;

function initRpcTrackers() {
  if (isInitialized) {
    return;
  }

  const chainIds = CONTRACTS_CHAIN_IDS.concat(SOURCE_CHAIN_IDS);

  for (const chainId of chainIds) {
    const config = isContractsChain(chainId)
      ? RPC_TRACKER_CONFIG_FOR_CONTRACTS_CHAINS
      : RPC_TRACKER_CONFIG_FOR_SOURCE_CHAINS;

    const tracker = new RpcTracker({
      ...config,
      chainId: chainId as ContractsChainId,
    });

    RPC_TRACKERS_BY_KEY[tracker.trackerKey] = tracker;
    RPC_TRACKER_KEYS_BY_CHAIN_ID[chainId] = tracker.trackerKey;

    subscribeForRpcTrackerMetrics(tracker);
    _debugRpcTracker?.subscribeForRpcTrackerDebugging(tracker);

    tracker.fallbackTracker.startTracking();
  }

  isInitialized = true;
}

if (getIsFlagEnabled("testRpcFallbackUpdates")) {
  initRpcTrackers();
} else {
  old_trackRpcProviders({ warmUp: true });
}

export const getCurrentRpcUrls = getIsFlagEnabled("testRpcFallbackUpdates")
  ? _getCurrentRpcUrls
  : old_getCurrentRpcUrls;

export const useCurrentRpcUrls = getIsFlagEnabled("testRpcFallbackUpdates")
  ? _useCurrentRpcUrls
  : old_useCurrentRpcUrls;

export function getRpcTracker(trackerKey: string): RpcTracker | undefined {
  return RPC_TRACKERS_BY_KEY[trackerKey];
}

export function getRpcTrackerByChainId(chainId: number): RpcTracker | undefined {
  const trackerKey = RPC_TRACKER_KEYS_BY_CHAIN_ID[chainId];
  return getRpcTracker(trackerKey);
}

function _getCurrentRpcUrls(chainId: number) {
  // Check rpc providers existence to throw an error if no providers are configured for chainId
  const defaultRpcProviders = getRpcProviders(chainId, "default");
  const privateRpcProviders = getIsLargeAccount()
    ? getRpcProviders(chainId, "largeAccount")
    : getRpcProviders(chainId, "fallback");

  let primary = defaultRpcProviders?.[0]?.url;

  if (!primary) {
    throw new Error(`No RPC providers found for chainId: ${chainId}`);
  }
  let secondary = privateRpcProviders?.[0]?.url ?? primary;

  const tracker = getRpcTrackerByChainId(chainId);
  if (tracker) {
    return tracker.pickCurrentRpcUrls();
  }

  return { primary, secondary, trackerKey: "unknown" };
}

export function getCurrentExpressRpcUrl(chainId: number) {
  const tracker = getRpcTrackerByChainId(chainId);
  if (tracker) {
    return tracker.getExpressRpcUrl();
  }
  return getExpressRpcUrl(chainId);
}

function _useCurrentRpcUrls(chainId: number) {
  const [bestRpcUrls, setBestRpcUrls] = useState<{
    primary: string;
    secondary: string;
  }>(() => _getCurrentRpcUrls(chainId));

  useEffect(() => {
    let isMounted = true;

    setBestRpcUrls(_getCurrentRpcUrls(chainId));
    const tracker = getRpcTrackerByChainId(chainId);

    if (!tracker) {
      return;
    }

    const unsubscribe = addFallbackTrackerListenner(
      "endpointsUpdated",
      tracker.trackerKey,
      ({ primary, secondary }) => {
        if (!isMounted) {
          return;
        }

        setBestRpcUrls({
          primary,
          secondary,
        });
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [chainId]);

  return bestRpcUrls;
}
