import orderBy from "lodash/orderBy";

import { getChainName } from "config/chains";
import { getProviderNameFromUrl } from "config/rpc";
import { devtools as globalDevtools } from "lib/devtools";
import { FALLBACK_TRACKER_TRIGGER_FAILURE_EVENT_KEY, type EndpointFailureDetail } from "lib/FallbackTracker/events";

import { RpcTracker } from "./RpcTracker";

class RpcDevtools {
  private endpointFailures: Map<string, number> = new Map();
  private listeners: Array<(failures: Map<string, number>) => void> = [];

  constructor() {
    if (typeof window !== "undefined") {
      const handleFailureEvent = (event: Event) => {
        const customEvent = event as CustomEvent<EndpointFailureDetail>;
        const { endpoint } = customEvent.detail;
        const currentCount = this.endpointFailures.get(endpoint) || 0;
        this.endpointFailures.set(endpoint, currentCount + 1);
        this.notifyListeners();
      };

      window.addEventListener(FALLBACK_TRACKER_TRIGGER_FAILURE_EVENT_KEY, handleFailureEvent);
    }
  }

  get shouldMockPrivateRpcCheck() {
    return globalDevtools.getFlag("rpcTrackerMockPrivateRpcCheck");
  }

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

  getEndpointFailures(): Map<string, number> {
    return new Map(this.endpointFailures);
  }

  getFailureCount(endpoint: string): number {
    return this.endpointFailures.get(endpoint) || 0;
  }

  onFailuresUpdate(callback: (failures: Map<string, number>) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    const failures = this.getEndpointFailures();
    this.listeners.forEach((listener) => listener(failures));
  }

  clearFailures() {
    this.endpointFailures.clear();
    this.notifyListeners();
  }
}

export const devtools = new RpcDevtools();
