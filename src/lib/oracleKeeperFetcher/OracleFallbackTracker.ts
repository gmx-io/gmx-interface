import { ContractsChainId } from "config/rpc";
import { DEFAULT_FALLBACK_TRACKER_CONFIG, FallbackTracker, EndpointStats } from "lib/FallbackTracker";

type OracleCheckResult = {
  endpoint: string;
  isValid: boolean;
  responseTime: number | undefined;
  timestamp: number;
};

type OracleFallbackTrackerParams = {
  chainId: ContractsChainId;
  primary: string;
  secondary: string;
  fallbacks: string[];
};

export class OracleFallbackTracker {
  fallbackTracker: FallbackTracker<OracleCheckResult>;

  constructor(public readonly params: OracleFallbackTrackerParams) {
    const endpoints = [this.params.primary, this.params.secondary, ...this.params.fallbacks].filter(
      (endpoint, index, self) => self.indexOf(endpoint) === index
    );

    this.fallbackTracker = new FallbackTracker<OracleCheckResult>({
      ...DEFAULT_FALLBACK_TRACKER_CONFIG,
      trackerKey: `OracleKeeper-${this.params.chainId}`,
      primary: this.params.primary,
      secondary: this.params.secondary,
      endpoints,
      checkEndpoint: this.checkEndpoint,
      selectNextPrimary: this.selectNextPrimary,
      selectNextSecondary: this.selectNextSecondary,
    });
  }

  public getCurrentEndpoint() {
    return this.fallbackTracker.pickPrimaryEndpoint();
  }

  public getCurrentEndpoints() {
    return {
      primary: this.fallbackTracker.pickPrimaryEndpoint(),
      secondary: this.fallbackTracker.pickSecondaryEndpoint(),
    };
  }

  public triggerFailure(endpoint: string) {
    this.fallbackTracker.triggerFailure(endpoint);
  }

  public banEndpoint(endpoint: string, reason: string) {
    this.fallbackTracker.banEndpoint(endpoint, reason);
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

  selectNextPrimary = (params: {
    endpointsStats: EndpointStats<OracleCheckResult>[];
    primary: string;
    secondary: string;
  }): string | undefined => {
    const { endpointsStats, primary } = params;
    const valid = endpointsStats.filter(
      (stat) => stat.checkResult?.success && stat.checkResult?.stats?.isValid && !stat.banned
    );

    if (valid.length === 0) {
      return primary;
    }

    const ranked = valid.sort((a, b) => {
      const aTime = a.checkResult?.stats?.responseTime ?? Infinity;
      const bTime = b.checkResult?.stats?.responseTime ?? Infinity;
      return aTime - bTime;
    });

    return ranked[0]?.endpoint;
  };

  selectNextSecondary = (params: {
    endpointsStats: EndpointStats<OracleCheckResult>[];
    primary: string;
    secondary: string;
  }): string | undefined => {
    const { endpointsStats, secondary } = params;
    const valid = endpointsStats.filter(
      (stat) => stat.checkResult?.success && stat.checkResult?.stats?.isValid && !stat.banned
    );

    if (valid.length === 0) {
      return secondary;
    }

    const ranked = valid.sort((a, b) => {
      const aTime = a.checkResult?.stats?.responseTime ?? Infinity;
      const bTime = b.checkResult?.stats?.responseTime ?? Infinity;
      return aTime - bTime;
    });

    // Return second best or first if only one available
    return ranked[1]?.endpoint ?? ranked[0]?.endpoint;
  };
}
