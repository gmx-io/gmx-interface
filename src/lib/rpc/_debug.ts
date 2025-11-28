import orderBy from "lodash/orderBy";

import { ContractsChainId, getChainName } from "config/chains";
import { isDevelopment } from "config/env";
import { getProviderNameFromUrl } from "config/rpc";
import { addFallbackTrackerListenner } from "lib/FallbackTracker/events";
import { Storage } from "lib/storage/Storage";

import { RpcTracker } from "./RpcTracker";

export enum RpcDebugFlags {
  LogRpcTracker = "logRpcTracker",
  DebugLargeAccount = "debugLargeAccount",
  DebugAlchemy = "debugAlchemy",
}

export type RpcDebugState = {
  [RpcDebugFlags.LogRpcTracker]: boolean;
  [RpcDebugFlags.DebugLargeAccount]: boolean;
  [RpcDebugFlags.DebugAlchemy]: boolean;
};

export type OldRpcTrackerDebugStats = {
  url: string;
  isPrimary: string;
  isValid: string;
  responseTime: number | null;
  blockNumber: number | null;
  purpose: string | undefined;
  isPublic: string;
};

export type OldRpcTrackerState = {
  primary: string;
  secondary: string;
  debugStats: OldRpcTrackerDebugStats[];
  timestamp: number;
};

export type DebugRpcEndpoint = {
  url: string;
  isPublic: boolean;
  purpose: string;
};

type DebugRpcEndpointsState = {
  endpoints: Record<number, DebugRpcEndpoint[]>;
};

class RpcTrackerDebug {
  storage: Storage<RpcDebugState>;
  oldRpcTrackerState: Map<number, OldRpcTrackerState>;
  debugRpcEndpointsStorage: Storage<DebugRpcEndpointsState>;

  constructor() {
    this.storage = new Storage<RpcDebugState>("rpcDebugState");
    this.oldRpcTrackerState = new Map();
    this.debugRpcEndpointsStorage = new Storage<DebugRpcEndpointsState>("debugRpcEndpoints");
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
    const secondary = fallbackTracker.state.secondary;

    const debugStats = endpoints.map((endpoint) => {
      const endpointStats = fallbackTracker.getEndpointStats(endpoint);
      const rpcConfig = rpcTracker.getRpcConfig(endpoint);
      const checkResult = endpointStats?.checkResult;

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
      secondary,
      debugStats,
      trackerState: fallbackTracker.state,
    };

    // eslint-disable-next-line no-console
    console.group(`RpcTracker ${getChainName(chainId)}`);
    // eslint-disable-next-line no-console
    console.log(`
    primary: ${debugStats.findIndex((stat) => stat.url === primary) + 1} ${primary}
    secondary: ${debugStats.findIndex((stat) => stat.url === secondary) + 1} ${secondary}
    `);
    // eslint-disable-next-line no-console
    console.table(orderBy(debugStats, ["responseTime"], ["asc"]));
    // eslint-disable-next-line no-console
    console.groupEnd();
  }

  setOldRpcTrackerState(chainId: number, state: OldRpcTrackerState) {
    this.oldRpcTrackerState.set(chainId as ContractsChainId, state);
  }

  getOldRpcTrackerState(chainId: number): OldRpcTrackerState | undefined {
    return this.oldRpcTrackerState.get(chainId as ContractsChainId);
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
    addFallbackTrackerListenner("endpointsUpdated", tracker.trackerKey, () => {
      this.debugRpcTrackerState(tracker);
    });

    addFallbackTrackerListenner("trackingFinished", tracker.trackerKey, () => {
      this.debugRpcTrackerState(tracker);
    });
  }
}

export const _debugRpcTracker = isDevelopment() ? new RpcTrackerDebug() : undefined;
