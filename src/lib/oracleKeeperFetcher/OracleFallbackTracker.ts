import orderBy from "lodash/orderBy";

import { ContractsChainId, getChainName } from "config/rpc";
import { FallbackTracker, FallbackTrackerConfig } from "lib/FallbackTracker";
import { byBanTimestamp, byResponseTime } from "lib/FallbackTracker/utils";
import { ORACLE_FALLBACK_TRACKER_CONFIG } from "sdk/configs/oracleKeeper";

type OracleCheckResult = {
  responseTime: number;
};

type OracleFallbackTrackerParams = FallbackTrackerConfig & {
  chainId: ContractsChainId;
  mainUrl: string;
  fallbacks: string[];
};

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
      secondary: this.params.fallbacks[0] ?? this.params.mainUrl,
      endpoints: [this.params.mainUrl, ...this.params.fallbacks],
      checkEndpoint: this.checkEndpoint,
      selectNextPrimary: this.selectEndpoint,
      selectNextSecondary: this.selectEndpoint,
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

  selectEndpoint = ({ endpointsStats }) => {
    const ranked = orderBy(endpointsStats, [byBanTimestamp, byResponseTime], ["asc", "asc"]);

    return ranked[0]?.endpoint;
  };
}
