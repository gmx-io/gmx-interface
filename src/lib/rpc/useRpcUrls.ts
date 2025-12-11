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
import { NetworkStatusObserver } from "lib/FallbackTracker/NetworkStatusObserver";
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

  const networkStatusObserver = NetworkStatusObserver.getInstance();
  const chainIds = CONTRACTS_CHAIN_IDS.concat(SOURCE_CHAIN_IDS);

  for (const chainId of chainIds) {
    const config = isContractsChain(chainId)
      ? RPC_TRACKER_CONFIG_FOR_CONTRACTS_CHAINS
      : RPC_TRACKER_CONFIG_FOR_SOURCE_CHAINS;

    const tracker = new RpcTracker({
      ...config,
      chainId: chainId as ContractsChainId,
      networkStatusObserver,
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
  // Would never happen in normal flow, but added for multichain localStorage safety
  if (chainId === undefined) {
    return { primary: undefined, fallbacks: [], trackerKey: "unknown", endpointsStats: [] };
  }

  const tracker = getRpcTrackerByChainId(chainId);
  if (tracker) {
    return tracker.pickCurrentRpcUrls();
  }

  // Check rpc providers existence to throw an error if no providers are configured for chainId
  const defaultRpcProviders = getRpcProviders(chainId, "default")?.map((p) => p.url);
  const privateRpcProviders = getIsLargeAccount()
    ? getRpcProviders(chainId, "largeAccount")?.map((p) => p.url)
    : getRpcProviders(chainId, "fallback")?.map((p) => p.url);

  let primary = defaultRpcProviders[0];

  if (!primary) {
    throw new Error(`No RPC providers found for chainId: ${chainId}`);
  }

  const fallbacks = [...defaultRpcProviders, ...(privateRpcProviders ?? [])].filter(
    (url) => url !== primary && url !== undefined
  );

  return { primary, fallbacks, trackerKey: "unknown", endpointsStats: [] };
}

export function getCurrentExpressRpcUrl(chainId: number) {
  const tracker = getRpcTrackerByChainId(chainId);
  if (tracker) {
    return tracker.getExpressRpcUrl();
  }
  return getExpressRpcUrl(chainId);
}

function _useCurrentRpcUrls(chainId: number): { primary: string; fallbacks: string[] } {
  const [bestRpcUrls, setBestRpcUrls] = useState<{
    primary: string;
    fallbacks: string[];
  }>(() => {
    const result = _getCurrentRpcUrls(chainId);
    return {
      primary: result.primary,
      fallbacks: result.fallbacks,
    };
  });

  useEffect(() => {
    let isMounted = true;

    const result = _getCurrentRpcUrls(chainId);
    setBestRpcUrls({
      primary: result.primary,
      fallbacks: result.fallbacks,
    });
    const tracker = getRpcTrackerByChainId(chainId);

    if (!tracker) {
      return;
    }

    const unsubscribe: () => void = addFallbackTrackerListenner(
      "endpointsUpdated",
      tracker.trackerKey,
      ({ primary, fallbacks }) => {
        if (!isMounted) {
          return;
        }

        setBestRpcUrls({
          primary,
          fallbacks,
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
