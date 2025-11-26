import { orderBy } from "lodash-es";

import { ContractsChainId } from "config/rpc";
import { DEFAULT_FALLBACK_TRACKER_CONFIG, FallbackTracker } from "lib/FallbackTracker";

type OracleCheckResult = {
  endpoint: string;
  isValid: boolean;
  responseTime: number | undefined;
  timestamp: number;
};

type OracleFallbackTrackerParams = {
  chainId: ContractsChainId;
  mainUrl: string;
  fallbacks: string[];
};

export class OracleFallbackTracker {
  fallbackTracker: FallbackTracker<OracleCheckResult>;

  constructor(public readonly params: OracleFallbackTrackerParams) {
    const endpoints = [this.params.mainUrl, ...this.params.fallbacks].filter((s) => s !== undefined);

    this.fallbackTracker = new FallbackTracker<OracleCheckResult>({
      ...DEFAULT_FALLBACK_TRACKER_CONFIG,
      trackerKey: `OracleFallbackTracker:${this.params.chainId}`,
      primary: this.params.mainUrl,
      secondary: this.params.fallbacks[0] ?? this.params.mainUrl,
      endpoints,
      checkEndpoint: this.checkEndpoint,
      selectNextPrimary: this.selectEndpoint,
      selectNextSecondary: this.selectEndpoint,
    });
  }

  public getCurrentEndpoints() {
    return {
      primary: this.fallbackTracker.pickPrimaryEndpoint(),
      secondary: this.fallbackTracker.pickSecondaryEndpoint(),
    };
  }

  public reportFailure(endpoint: string) {
    this.fallbackTracker.reportFailure(endpoint);
  }

  public track(options?: { warmUp?: boolean }) {
    this.fallbackTracker.track(options);
  }

  public stopTracking() {
    this.fallbackTracker.stopTracking();
  }

  checkEndpoint = async (endpoint: string, signal: AbortSignal): Promise<OracleCheckResult> => {
    const startTime = Date.now();

    try {
      const response = await fetch(`${endpoint}/tickers`, { signal });

      if (!response.ok) {
        throw new Error("Failed to fetch tickers");
      }

      const tickers = await response.json();

      if (!tickers.length) {
        throw new Error("No tickers found");
      }

      const responseTime = Date.now() - startTime;

      return {
        endpoint,
        isValid: true,
        responseTime,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw error;
      }

      return {
        endpoint,
        isValid: false,
        responseTime: undefined,
        timestamp: Date.now(),
      };
    }
  };

  selectEndpoint = ({ endpointsStats }) => {
    const ranked = orderBy(endpointsStats, [(stat) => stat.checkResult?.stats?.responseTime ?? Infinity], ["asc"]);

    return ranked[1]?.endpoint;
  };
}
