import orderBy from "lodash/orderBy";

import { getChainName } from "config/chains";
import { isDevelopment } from "config/env";
import { getProviderNameFromUrl } from "config/rpc";
import { Storage } from "lib/storage/Storage";

import { RpcTracker } from "./RpcTracker";

export enum RpcDebugFlags {
  LogRpcTracker = "logRpcTracker",
  DebugLargeAccountRpc = "debugLargeAccountRpc",
  DebugFallbackRpc = "debugFallbackRpc",
}

export type RpcDebugState = {
  [RpcDebugFlags.LogRpcTracker]: boolean;
  [RpcDebugFlags.DebugLargeAccountRpc]: boolean;
  [RpcDebugFlags.DebugFallbackRpc]: boolean;
};

class RpcTrackerDebug {
  storage: Storage<RpcDebugState>;

  constructor() {
    this.storage = new Storage<RpcDebugState>("rpcDebugState");
  }

  get isEnabled() {
    return this.getFlag(RpcDebugFlags.LogRpcTracker);
  }

  getFlag(flag: RpcDebugFlags) {
    return this.storage.get(flag) ?? false;
  }

  setFlag(flag: RpcDebugFlags, value: boolean) {
    this.storage.set(flag, value);
  }

  debugRpcTrackerState(rpcTracker: RpcTracker) {
    if (!this.isEnabled) {
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
}

export const _debugRpcTracker = isDevelopment() ? new RpcTrackerDebug() : undefined;
