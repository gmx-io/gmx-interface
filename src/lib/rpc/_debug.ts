import orderBy from "lodash/orderBy";

import { getChainName } from "config/chains";
import { devtools as globalDevtools } from "lib/devtools";

import { RpcTracker } from "./RpcTracker";

class RpcDevtools {
  debugRpcTrackerState(rpcTracker: RpcTracker) {
    if (!globalDevtools.getFlag("debugRpcTracker")) {
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
        url: endpoint,
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

export const devtools = new RpcDevtools();
