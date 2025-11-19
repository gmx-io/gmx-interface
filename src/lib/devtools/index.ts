import orderBy from "lodash/orderBy";

import { getChainName } from "config/chains";
import { SHOW_DEBUG_VALUES_KEY } from "config/localStorage";
import { ProbeData, ProbeStats, RpcProviderState } from "lib/rpcTracker/types";

export function isDebugMode() {
  return localStorage.getItem(JSON.stringify(SHOW_DEBUG_VALUES_KEY)) === "true";
}

export function setDebugMode(value: boolean) {
  localStorage.setItem(JSON.stringify(SHOW_DEBUG_VALUES_KEY), value.toString());
}

class Devtools {
  debugRpcTrackerState({
    chainId,
    lastProbeStats,
    providers,
    bestPrimaryUrl,
    bestSecondaryUrl,
    getBannedTimestamp,
  }: {
    chainId: number;
    lastProbeStats: ProbeStats | undefined;
    providers: Record<string, RpcProviderState>;
    bestPrimaryUrl: string;
    bestSecondaryUrl: string;
    getBannedTimestamp: (url: string) => number | undefined;
  }) {
    if (!isDebugMode()) {
      return;
    }

    const debugStats = Object.values(lastProbeStats?.probeResults ?? {}).map((probe: ProbeData) => ({
      url: probe.url,
      isPublic: providers[probe.url]?.isPublic ? "✅" : "❌",
      isPrimary: probe.url === bestPrimaryUrl ? "✅" : "❌",
      isSecondary: probe.url === bestSecondaryUrl ? "✅" : "❌",
      isValid: probe.isValid ? "✅" : "❌",
      responseTime: probe.responseTime,
      blockNumber: probe.blockNumber,
      bannedTimestamp: getBannedTimestamp(probe.url) ?? "",
    }));

    (window as any).rpcTracker = (window as any).rpcTracker || {};
    (window as any).rpcTracker[chainId] = {
      primary: bestPrimaryUrl,
      secondary: bestSecondaryUrl,
      debugStats,
    };

    // eslint-disable-next-line no-console
    console.group(`RpcTracker ${getChainName(chainId)}`);
    // eslint-disable-next-line no-console
    console.table(orderBy(debugStats, ["responseTime"], ["asc"]));
    // eslint-disable-next-line no-console
    console.groupEnd();
  }
}

export const devtools = new Devtools();
