import { useEffect, useState } from "react";

import { CONTRACTS_CHAIN_IDS, ContractsChainId, isContractsChain, SOURCE_CHAIN_IDS } from "config/chains";
import {
  getExpressRpcUrl,
  getRpcProviders,
  RPC_TRACKER_CONFIG_FOR_CONTRACTS_CHAINS,
  RPC_TRACKER_CONFIG_FOR_SOURCE_CHAINS,
} from "config/rpc";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { addFallbackTrackerListener } from "lib/FallbackTracker/events";
import { NetworkStatusObserver } from "lib/FallbackTracker/NetworkStatusObserver";
import { subscribeForRpcTrackerMetrics } from "lib/metrics/rpcTrackerMetrics";
import { RpcTracker } from "lib/rpc/RpcTracker";

import { _debugRpcTracker } from "./_debug";

class RpcTrackersRegistry {
  private static instance: RpcTrackersRegistry | null = null;

  trackersByKey: Record<string, RpcTracker> = {};
  trackerKeysByChainId: Record<number, string> = {};
  isInitialized = false;

  static getInstance(): RpcTrackersRegistry {
    if (!RpcTrackersRegistry.instance) {
      RpcTrackersRegistry.instance = new RpcTrackersRegistry();
      RpcTrackersRegistry.instance.init();
    }
    return RpcTrackersRegistry.instance;
  }

  init() {
    if (this.isInitialized) {
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

      this.trackersByKey[tracker.trackerKey] = tracker;
      this.trackerKeysByChainId[chainId] = tracker.trackerKey;

      subscribeForRpcTrackerMetrics(tracker);
      _debugRpcTracker?.subscribeForRpcTrackerDebugging(tracker);

      tracker.fallbackTracker.startTracking();
    }

    this.isInitialized = true;
  }

  getRpcTracker(trackerKey: string): RpcTracker | undefined {
    return this.trackersByKey[trackerKey];
  }

  getRpcTrackerByChainId(chainId: number): RpcTracker | undefined {
    const trackerKey = this.trackerKeysByChainId[chainId];
    return this.getRpcTracker(trackerKey);
  }

  getCurrentRpcUrls(chainId: number) {
    // Would never happen in normal flow, but added for multichain localStorage safety
    if (chainId === undefined) {
      return { primary: undefined, fallbacks: [], trackerKey: "unknown", endpointsStats: [] };
    }

    const tracker = this.getRpcTrackerByChainId(chainId);
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
}

export function getRpcTrackerByChainId(chainId: number): RpcTracker | undefined {
  return RpcTrackersRegistry.getInstance().getRpcTrackerByChainId(chainId);
}

export function getCurrentRpcUrls(chainId: number) {
  return RpcTrackersRegistry.getInstance().getCurrentRpcUrls(chainId);
}

export function getCurrentExpressRpcUrl(chainId: number) {
  const tracker = getRpcTrackerByChainId(chainId);
  if (tracker) {
    return tracker.getExpressRpcUrl();
  }
  return getExpressRpcUrl(chainId);
}

export function useCurrentRpcUrls(chainId: number): { primary: string; fallbacks: string[] } {
  const [bestRpcUrls, setBestRpcUrls] = useState<{
    primary: string;
    fallbacks: string[];
  }>(() => {
    const result = getCurrentRpcUrls(chainId);
    return {
      primary: result.primary,
      fallbacks: result.fallbacks,
    };
  });

  useEffect(() => {
    let isMounted = true;

    const result = getCurrentRpcUrls(chainId);
    setBestRpcUrls({
      primary: result.primary,
      fallbacks: result.fallbacks,
    });
    const tracker = getRpcTrackerByChainId(chainId);

    if (!tracker) {
      return;
    }

    const unsubscribe: () => void = addFallbackTrackerListener(
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
