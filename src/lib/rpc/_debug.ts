import orderBy from "lodash/orderBy";

import { getChainName } from "config/chains";
import { isDevelopment } from "config/env";
import { DEBUG_RPC_ENDPOINTS_KEY, RPC_DEBUG_STATE_KEY } from "config/localStorage";
import { getProviderNameFromUrl } from "config/rpc";
import { addFallbackTrackerListener } from "lib/FallbackTracker/events";
import { Storage } from "lib/storage/Storage";

import type { RpcTracker } from "./RpcTracker";

export enum RpcDebugFlags {
  LogRpcTracker = "logRpcTracker",
  DebugLargeAccount = "debugLargeAccount",
  DebugAlchemy = "debugAlchemy",
}

type RpcDebugState = {
  [RpcDebugFlags.LogRpcTracker]: boolean;
  [RpcDebugFlags.DebugLargeAccount]: boolean;
  [RpcDebugFlags.DebugAlchemy]: boolean;
};

type DebugRpcEndpoint = {
  url: string;
  isPublic: boolean;
  purpose: string;
};

type DebugRpcEndpointsState = {
  endpoints: Record<number, DebugRpcEndpoint[]>;
};

class RpcTrackerDebug {
  storage: Storage<RpcDebugState>;
  debugRpcEndpointsStorage: Storage<DebugRpcEndpointsState>;

  constructor() {
    this.storage = new Storage<RpcDebugState>(RPC_DEBUG_STATE_KEY);
    this.debugRpcEndpointsStorage = new Storage<DebugRpcEndpointsState>(DEBUG_RPC_ENDPOINTS_KEY);
  }

  private getEndpointsState(): Record<number, DebugRpcEndpoint[]> {
    return this.debugRpcEndpointsStorage.get("endpoints") ?? {};
  }

  private saveEndpointsState(endpoints: Record<number, DebugRpcEndpoint[]>) {
    this.debugRpcEndpointsStorage.set("endpoints", endpoints);
  }

  getFlag(flag: RpcDebugFlags) {
    return this.storage.get(flag) ?? false;
  }

  setFlag(flag: RpcDebugFlags, value: boolean) {
    this.storage.set(flag, value);
  }

  debugRpcTrackerState(rpcTracker: RpcTracker) {
    if (!this.getFlag(RpcDebugFlags.LogRpcTracker)) {
      return;
    }

    const chainId = rpcTracker.params.chainId;
    const fallbackTracker = rpcTracker.fallbackTracker;
    const endpoints = fallbackTracker.params.endpoints;
    const primary = fallbackTracker.state.primary;
    const fallbacks = fallbackTracker.state.fallbacks;

    const debugStats = endpoints.map((endpoint) => {
      const endpointStats = fallbackTracker.getEndpointStats(endpoint);
      const rpcConfig = rpcTracker.getRpcConfig(endpoint);
      const checkResult = endpointStats?.checkResults?.[0];

      return {
        url: getProviderNameFromUrl(endpoint),
        purpose: rpcConfig?.purpose ?? "unknown",
        isPublic: rpcConfig?.isPublic ? "✅" : "❌",
        success: checkResult?.success ? "✅" : "❌",
        responseTime: checkResult?.stats?.responseTime ?? "—",
        blockNumber: checkResult?.stats?.blockNumber ?? "—",
        bannedTimestamp: endpointStats?.banned?.timestamp ?? "",
        failureCount: endpointStats?.failureTimestamps?.length ?? 0,
      };
    });

    (window as any).rpcTracker = (window as any).rpcTracker || {};
    (window as any).rpcTracker[chainId] = {
      primary,
      fallbacks,
      debugStats,
      trackerState: fallbackTracker.state,
    };

    // eslint-disable-next-line no-console
    console.group(`RpcTracker ${getChainName(chainId)}`);
    // eslint-disable-next-line no-console
    console.log(`
    primary: ${debugStats.findIndex((stat) => stat.url === primary) + 1} ${primary}
    fallbacks: ${fallbacks.map((fb) => `${debugStats.findIndex((stat) => stat.url === fb) + 1} ${fb}`).join(", ")}
    `);
    // eslint-disable-next-line no-console
    console.table(orderBy(debugStats, ["responseTime"], ["asc"]));
    // eslint-disable-next-line no-console
    console.groupEnd();
  }

  setDebugRpcEndpoint(chainId: number, url: string, isPublic: boolean, purpose: string) {
    const endpointsState = this.getEndpointsState();
    const endpoints = endpointsState[chainId] ?? [];

    const filteredEndpoints = endpoints.filter((ep) => ep.url !== url);
    filteredEndpoints.push({ url, isPublic, purpose });

    endpointsState[chainId] = filteredEndpoints;
    this.saveEndpointsState(endpointsState);
  }

  getDebugRpcEndpoints(chainId: number): DebugRpcEndpoint[] {
    const endpointsState = this.getEndpointsState();
    return endpointsState[chainId] ?? [];
  }

  removeDebugRpcEndpoint(chainId: number, url: string) {
    const endpointsState = this.getEndpointsState();
    const endpoints = endpointsState[chainId] ?? [];
    const filteredEndpoints = endpoints.filter((ep) => ep.url !== url);

    if (filteredEndpoints.length === 0) {
      delete endpointsState[chainId];
    } else {
      endpointsState[chainId] = filteredEndpoints;
    }
    this.saveEndpointsState(endpointsState);
  }

  getAllDebugRpcEndpoints(): Record<number, DebugRpcEndpoint[]> {
    return this.getEndpointsState();
  }

  subscribeForRpcTrackerDebugging(tracker: RpcTracker) {
    addFallbackTrackerListener("endpointsUpdated", tracker.trackerKey, () => {
      this.debugRpcTrackerState(tracker);
    });

    addFallbackTrackerListener("trackingFinished", tracker.trackerKey, () => {
      this.debugRpcTrackerState(tracker);
    });
  }
}

export const _debugRpcTracker = isDevelopment() ? new RpcTrackerDebug() : undefined;
