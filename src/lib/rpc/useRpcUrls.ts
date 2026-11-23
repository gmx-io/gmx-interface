import uniq from "lodash/uniq";
import { useEffect, useState } from "react";

import {
  CONTRACTS_CHAIN_IDS,
  ContractsChainId,
  isContractsChain,
  isTestnetChain,
  SOURCE_CHAIN_IDS,
} from "config/chains";
import { isDevelopment } from "config/env";
import {
  getExpressRpcUrl,
  getRpcProviders,
  RPC_TRACKER_CONFIG_FOR_CONTRACTS_CHAINS,
  RPC_TRACKER_CONFIG_FOR_SOURCE_CHAINS,
} from "config/rpc";
import { getIsSolanaNetworkSelected } from "config/solanaNetwork";
import { getIsLargeAccountChain } from "domain/stats/isLargeAccount";
import { addFallbackTrackerListener } from "lib/FallbackTracker/events";
import { NetworkStatusObserver } from "lib/FallbackTracker/NetworkStatusObserver";
import { RpcTracker } from "lib/rpc/RpcTracker";

import { getRegisteredRpcTracker, registerRpcTracker } from "./registry";
import type { RpcTrackerObserver } from "./types";

class RpcTrackersRegistry {
  private static instance: RpcTrackersRegistry | null = null;

  trackersByKey: Record<string, RpcTracker> = {};
  trackerKeysByChainId: Record<number, string> = {};
  isInitialized = false;
  private trackingEnabled = false;

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
    const chainIds = uniq([...CONTRACTS_CHAIN_IDS, ...SOURCE_CHAIN_IDS]).filter(
      (chainId) => isDevelopment() || !isTestnetChain(chainId)
    );

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

      registerRpcTracker(tracker);
    }

    this.isInitialized = true;
    this.syncTracking();
  }

  // Health checks hit every EVM RPC, including Arbitrum and Ethereum public nodes.
  // Solana keeps chainId on Arbitrum, so the selection has to stop them explicitly.
  syncTracking() {
    const enabled = !getIsSolanaNetworkSelected();

    if (this.trackingEnabled === enabled) {
      return;
    }

    this.trackingEnabled = enabled;

    for (const tracker of Object.values(this.trackersByKey)) {
      if (enabled) {
        tracker.fallbackTracker.startTracking();
      } else {
        tracker.fallbackTracker.stopTracking();
      }
    }
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
      return { primary: undefined, fallbacks: [] as string[], trackerKey: "unknown", endpointsStats: [] };
    }

    const tracker = this.getRpcTrackerByChainId(chainId);
    if (tracker) {
      return tracker.pickCurrentRpcUrls();
    }

    const registered = getRegisteredRpcTracker(chainId);
    if (registered) {
      return registered.fallbackTracker.getCurrentEndpoints();
    }

    // Check rpc providers existence to throw an error if no providers are configured for chainId
    const defaultRpcProviders = getRpcProviders(chainId, "default")?.map((p) => p.url);
    const privateRpcProviders = getIsLargeAccountChain(chainId)
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

export function syncEvmRpcTracking() {
  RpcTrackersRegistry.getInstance().syncTracking();
}

export function getRpcTrackerByChainId(chainId: number): RpcTrackerObserver | undefined {
  return RpcTrackersRegistry.getInstance().getRpcTrackerByChainId(chainId) ?? getRegisteredRpcTracker(chainId);
}

export function getCurrentRpcUrls(chainId: number) {
  const registry = RpcTrackersRegistry.getInstance();
  registry.syncTracking();
  return registry.getCurrentRpcUrls(chainId);
}

export function getCurrentExpressRpcUrl(chainId: number) {
  const tracker = RpcTrackersRegistry.getInstance().getRpcTrackerByChainId(chainId);
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
      primary: result.primary!,
      fallbacks: result.fallbacks,
    };
  });

  useEffect(() => {
    let isMounted = true;

    const result = getCurrentRpcUrls(chainId);
    setBestRpcUrls({
      primary: result.primary!,
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
