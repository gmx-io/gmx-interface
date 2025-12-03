import orderBy from "lodash/orderBy";

import { ContractsChainId, getChainName } from "config/rpc";
import { CurrentEndpoints, EndpointStats, FallbackTracker, FallbackTrackerConfig } from "lib/FallbackTracker";
import { getAvgResponseTime, scoreBySpeedAndConsistency, scoreNotBanned } from "lib/FallbackTracker/utils";
import { ORACLE_FALLBACK_TRACKER_CONFIG } from "sdk/configs/oracleKeeper";

type OracleCheckResult = {
  responseTime: number;
};

type OracleFallbackTrackerParams = FallbackTrackerConfig & {
  chainId: ContractsChainId;
  mainUrl: string;
  fallbacks: string[];
};

export type OracleEndpointStats = EndpointStats<OracleCheckResult>;

export type OracleCurrentEndpoints = CurrentEndpoints<OracleCheckResult>;

export class OracleKeeperFallbackTracker {
  fallbackTracker: FallbackTracker<OracleCheckResult>;

  get trackerKey() {
    return this.fallbackTracker.trackerKey;
  }

  constructor(public readonly params: OracleFallbackTrackerParams) {
    this.fallbackTracker = new FallbackTracker<OracleCheckResult>({
      ...ORACLE_FALLBACK_TRACKER_CONFIG,
      trackerKey: `OracleFallbackTracker:${getChainName(this.params.chainId)}`,
      primary: this.params.mainUrl,
      endpoints: [this.params.mainUrl, ...this.params.fallbacks],
      checkEndpoint: this.checkEndpoint,
      selectNextPrimary: this.selectNextPrimaryEndpoint,
      selectNextFallbacks: this.selectNextFallbacks,
    });
  }

  public getCurrentEndpoints() {
    return this.fallbackTracker.getCurrentEndpoints();
  }

  public reportFailure(endpoint: string) {
    this.fallbackTracker.reportFailure(endpoint);
  }

  public startTracking() {
    this.fallbackTracker.startTracking();
  }

  checkEndpoint = async (endpoint: string, signal: AbortSignal): Promise<OracleCheckResult> => {
    const startTime = Date.now();

    const response = await fetch(`${endpoint}/prices/tickers`, { signal, priority: "low" });

    if (!response.ok) {
      throw new Error("Failed to fetch tickers");
    }

    const tickers = await response.json();

    if (!tickers.length) {
      throw new Error("No tickers found");
    }

    const responseTime = Date.now() - startTime;

    return {
      responseTime,
    };
  };

  selectNextPrimaryEndpoint = ({ endpointsStats }: { endpointsStats: OracleEndpointStats[] }) => {
    const avgResponseTime = getAvgResponseTime(endpointsStats);
    const ranked = orderBy(
      endpointsStats,
      [scoreNotBanned, scoreBySpeedAndConsistency(avgResponseTime)],
      ["desc", "desc"]
    );

    return ranked[0]?.endpoint;
  };

  selectNextFallbacks = ({ endpointsStats }: { endpointsStats: OracleEndpointStats[] }) => {
    const avgResponseTime = getAvgResponseTime(endpointsStats);
    const ranked = orderBy(
      endpointsStats,
      [scoreNotBanned, scoreBySpeedAndConsistency(avgResponseTime)],
      ["desc", "desc"]
    );
    return ranked.map((result) => result.endpoint);
  };
}
