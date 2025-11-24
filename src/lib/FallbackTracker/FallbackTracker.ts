import { differenceInMilliseconds } from "date-fns";

import { getFallbackTrackerKey } from "config/localStorage";
import { ErrorLike } from "lib/errors";
import { sleepWithSignal } from "lib/sleep";
import { combineAbortSignals } from "sdk/utils/abort";

export const DEFAULT_FALLBACK_CONFIG = {
  trackInterval: 10 * 1000, // 10 seconds
  checkTimeout: 10 * 1000, // 10 seconds
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  disableUnusedTrackingTimeout: 1 * 60 * 1000, // 1 minute
  failuresBeforeBan: {
    count: 3, // 3 failures
    window: 60 * 1000, // 1 minute
    debounce: 2 * 1000, // 2 seconds
  },
  switchEndpointsDebounce: 10 * 1000, // 10 seconds
  maxStoredCheckStats: 1, // 10 check stats
};

export type FallbackTrackerParams<TCheckResult> = {
  /** Storage key for endpoints state */
  trackerKey: string;

  /** Frequency of endpoint probing */
  trackInterval: number;

  /** Pause probing if no requests for the best endpoint for this time */
  disableUnusedTrackingTimeout: number;

  /** Time after which endpoint saved in the localStorage is considered stale */
  cacheTimeout: number;

  /** Abort endpoint probe if it takes longer */
  checkTimeout: number;

  failuresBeforeBan: {
    /** Number of failures before banning endpoint */
    count: number;
    /** Time window for counting failures */
    window: number;
    /** Throttle for counting failures */
    debounce: number;
  };

  /** Debounce for switching endpoints */
  switchEndpointsDebounce: number;

  /** Maximum number of check stats to store */
  maxStoredCheckStats: number;

  /** Default primary endpoint */
  primary: string;

  /** Default secondary endpoint */
  secondary: string;

  /** All endpoints to track */
  endpoints: string[];

  /** Check endpoint implementation */
  checkEndpoint: (endpoint: string, signal: AbortSignal) => Promise<TCheckResult>;

  /** Ranking implementation for primary endpoint */
  selectNextPrimary: (params: {
    endpointsStats: EndpointStats<TCheckResult>[];
    primary: string;
    secondary: string;
  }) => string | undefined;

  /** Ranking implementation for secondary endpoint */
  selectNextSecondary: (params: {
    endpointsStats: EndpointStats<TCheckResult>[];
    primary: string;
    secondary: string;
  }) => string | undefined;

  onUpdate?: () => void;
};

export type FallbackTrackerState<TCheckStats> = {
  primary: string;
  secondary: string;
  lastUsage: number | undefined;
  endpointsState: {
    [endpoint: string]: EndpointState;
  };
  checkStats: {
    timestamp: number;
    results: {
      [endpoint: string]: CheckResult<TCheckStats>;
    };
  }[];

  trackerTimeoutId: number | undefined;
  abortController: AbortController | undefined;
  switchEndpointsTimeout: number | undefined;
};

export type EndpointState = {
  endpoint: string;
  banned:
    | {
        timestamp: number;
        reason: string;
      }
    | undefined;
  failureTimestamps: number[];
  failureDebounceTimeout: NodeJS.Timeout | undefined;
};

export type CheckResult<TCheckStats> = {
  endpoint: string;
  success: boolean;
  error?: ErrorLike;
  stats: TCheckStats | undefined;
};

export type EndpointStats<TCheckStats> = EndpointState & {
  checkResult: CheckResult<TCheckStats> | undefined;
};

export type StoredEndpointsState = {
  primary: string;
  secondary: string;
  timestamp: number;
};

export class FallbackTracker<TCheckStats> {
  state: FallbackTrackerState<TCheckStats>;

  get trackerKey() {
    return getFallbackTrackerKey(this.params.trackerKey);
  }

  get edpointsUpdatedEventKey() {
    return `${this.trackerKey}:endpointsUpdated`;
  }

  emitEndpointsUpdated(primary: string, secondary: string) {
    window.dispatchEvent(new CustomEvent(this.edpointsUpdatedEventKey, { detail: { primary, secondary } }));
    this.params.onUpdate?.();
  }

  warn(message: string) {
    // eslint-disable-next-line no-console
    console.warn(`[${this.trackerKey}]: ${message}`);
  }

  getLastCheckResults(): Record<string, CheckResult<TCheckStats>> | undefined {
    return this.state.checkStats[this.state.checkStats.length - 1]?.results;
  }

  getEndpointStats(endpoint: string): EndpointStats<TCheckStats> | undefined {
    const state = this.state.endpointsState[endpoint];

    if (!state) {
      this.warn(`Endpoint "${endpoint}" not found in state`);
      return undefined;
    }

    const lastCheckResults = this.getLastCheckResults();

    return {
      ...state,
      checkResult: lastCheckResults?.[endpoint] ?? undefined,
    };
  }

  constructor(public readonly params: FallbackTrackerParams<TCheckStats>) {
    let primary = this.params.primary;
    let secondary = this.params.secondary;

    if (!this.params.endpoints.length) {
      throw new Error("No endpoints provided");
    }

    if (!this.params.endpoints.includes(this.params.primary)) {
      throw new Error("Primary endpoint is not in endpoints list");
    }

    if (!this.params.endpoints.includes(this.params.secondary)) {
      throw new Error("Secondary endpoint is not in endpoints list");
    }

    const stored = this.loadEndpointsState(this.params.endpoints);

    if (stored) {
      primary = stored.primary;
      secondary = stored.secondary;
    }

    this.state = {
      primary,
      secondary,
      lastUsage: undefined,
      endpointsState: this.params.endpoints.reduce(
        (acc, endpoint) => {
          acc[endpoint] = {
            endpoint,
            failureTimestamps: [],
            banned: undefined,
            failureDebounceTimeout: undefined,
          };
          return acc;
        },
        {} as Record<string, EndpointState>
      ),
      checkStats: [],
      trackerTimeoutId: undefined,
      abortController: undefined,
      switchEndpointsTimeout: undefined,
    };
  }

  public triggerFailure = (endpoint: string) => {
    const endpointState = this.state.endpointsState[endpoint];

    if (!endpointState) {
      this.warn(`Trigger failure for invalid endpoint "${endpoint}"`);
      return;
    }

    const processFailure = () => {
      const now = Date.now();

      endpointState.failureTimestamps.push(now);

      const windowStart = now - this.params.failuresBeforeBan.window;
      endpointState.failureTimestamps = endpointState.failureTimestamps.filter((timestamp) => timestamp >= windowStart);

      const failureCount = endpointState.failureTimestamps.length;

      if (failureCount >= this.params.failuresBeforeBan.count) {
        this.banEndpoint(endpoint, "Banned by failures threshold");
      }
    };

    if (!endpointState.failureDebounceTimeout) {
      processFailure();
      endpointState.failureDebounceTimeout = window.setTimeout(() => {
        endpointState.failureDebounceTimeout = undefined;
      }, this.params.failuresBeforeBan.debounce) as unknown as NodeJS.Timeout;
      return;
    }

    clearTimeout(endpointState.failureDebounceTimeout);

    endpointState.failureDebounceTimeout = window.setTimeout(() => {
      processFailure();
      endpointState.failureDebounceTimeout = undefined;
    }, this.params.failuresBeforeBan.debounce) as unknown as NodeJS.Timeout;
  };

  public banEndpoint = (endpoint: string, reason: string) => {
    const endpointState = this.state.endpointsState[endpoint];

    if (!endpointState) {
      this.warn(`Ban invalid endpoint "${endpoint}"`);
      return;
    }

    endpointState.banned = {
      timestamp: Date.now(),
      reason,
    };

    const keepPrimary = this.state.primary !== endpoint;
    const keepSecondary = this.state.secondary !== endpoint;

    // Avoid switching not banned endpoints.
    this.selectBestEndpoints({ keepPrimary, keepSecondary });
  };

  public pickPrimaryEndpoint() {
    if (!this.state.primary || !this.state.endpointsState[this.state.primary]) {
      // Should never happen, but for safety return primary from config
      this.warn(`No primary endpoint`);
      return this.params.primary;
    }

    this.state.lastUsage = Date.now();

    return this.state.primary;
  }

  public pickSecondaryEndpoint() {
    if (!this.state.secondary || !this.state.endpointsState[this.state.secondary]) {
      return this.params.primary;
    }

    this.state.lastUsage = Date.now();

    return this.state.secondary;
  }

  public getEndpoints() {
    return this.params.endpoints;
  }

  public track({ warmUp = false } = {}) {
    if (!this.shouldTrack({ warmUp })) {
      return;
    }

    if (this.state.trackerTimeoutId) {
      clearTimeout(this.state.trackerTimeoutId);
      this.state.trackerTimeoutId = undefined;
    }

    this.checkEndpoints()
      .then(() => {
        this.selectBestEndpoints();
      })
      .finally(() => {
        this.state.trackerTimeoutId = window.setTimeout(() => this.track(), this.params.trackInterval);
      });
  }

  public stopTracking() {
    // Abort any pending probes.
    if (this.state.trackerTimeoutId) {
      clearTimeout(this.state.trackerTimeoutId);
      this.state.trackerTimeoutId = undefined;
    }

    if (this.state.abortController) {
      this.state.abortController.abort();
      this.state.abortController = undefined;
    }

    // Clear all debounce timeouts
    if (this.state.switchEndpointsTimeout) {
      clearTimeout(this.state.switchEndpointsTimeout);
      this.state.switchEndpointsTimeout = undefined;
    }

    Object.values(this.state.endpointsState).forEach((endpointState) => {
      if (endpointState.failureDebounceTimeout) {
        clearTimeout(endpointState.failureDebounceTimeout);
        endpointState.failureDebounceTimeout = undefined;
      }
    });
  }

  selectBestEndpoints = ({
    keepPrimary = false,
    keepSecondary = false,
  }: { keepPrimary?: boolean; keepSecondary?: boolean } = {}) => {
    const processSelectBestEndpoints = () => {
      const endpointsStats = this.params.endpoints
        .map((endpoint) => this.getEndpointStats(endpoint))
        .filter((s): s is EndpointStats<TCheckStats> => s !== undefined);

      const statsForPrimary = keepSecondary
        ? endpointsStats.filter((s) => s.endpoint !== this.state.secondary)
        : endpointsStats;

      let nextPrimary: string | undefined = this.state.primary;
      if (!keepPrimary) {
        try {
          nextPrimary = this.params.selectNextPrimary({
            endpointsStats: statsForPrimary,
            primary: this.state.primary,
            secondary: this.state.secondary,
          });
        } catch (error) {
          this.warn(`Error in selectNextPrimary: ${error instanceof Error ? error.message : String(error)}`);
          // Fallback to current primary if selection failed
        }
      }

      if (!nextPrimary) {
        nextPrimary = this.state.primary;
      }

      const statsForSecondary = endpointsStats.filter((s) => s.endpoint !== nextPrimary);
      let nextSecondary: string | undefined = this.state.secondary;

      if (!keepSecondary) {
        try {
          nextSecondary = this.params.selectNextSecondary({
            endpointsStats: statsForSecondary,
            primary: this.state.primary,
            secondary: this.state.secondary,
          });
        } catch (error) {
          this.warn(`Error in selectNextSecondary: ${error instanceof Error ? error.message : String(error)}`);
          // Fallback to current secondary if selection fails
        }
      }

      if (!nextSecondary) {
        nextSecondary = this.state.secondary;
      }

      if (nextPrimary !== this.state.primary || nextSecondary !== this.state.secondary) {
        this.state.primary = nextPrimary;
        this.state.secondary = nextSecondary;

        this.saveEndpointsState({
          primary: nextPrimary,
          secondary: nextSecondary,
        });

        this.emitEndpointsUpdated(nextPrimary, nextSecondary);
      }
    };

    if (!this.state.switchEndpointsTimeout) {
      processSelectBestEndpoints();
      this.state.switchEndpointsTimeout = window.setTimeout(() => {
        this.state.switchEndpointsTimeout = undefined;
      }, this.params.switchEndpointsDebounce);
      return;
    }

    clearTimeout(this.state.switchEndpointsTimeout);

    this.state.switchEndpointsTimeout = window.setTimeout(() => {
      processSelectBestEndpoints();
      this.state.switchEndpointsTimeout = undefined;
    }, this.params.switchEndpointsDebounce);
  };

  async checkEndpoints() {
    const checkTimestamp = Date.now();
    const endpoints = this.params.endpoints;

    if (this.state.abortController) {
      this.state.abortController.abort();
    }

    const globalAbortController = new AbortController();
    this.state.abortController = globalAbortController;

    const checkResults = await Promise.allSettled(
      endpoints.map((endpoint) => {
        const timeoutController = new AbortController();
        const combinedController = combineAbortSignals(globalAbortController.signal, timeoutController.signal);

        return Promise.race([
          sleepWithSignal(this.params.checkTimeout, combinedController.signal).then(() => {
            timeoutController.abort();
            throw new Error("Check timeout");
          }),
          this.params.checkEndpoint(endpoint, combinedController.signal),
        ]);
      })
    );

    // Implement basic result failed.
    // If results failed we still want to check endpoints.
    const results = endpoints.map((endpoint, index): CheckResult<TCheckStats> => {
      const result = checkResults[index];

      if (result.status === "fulfilled") {
        return {
          endpoint,
          success: true,
          stats: result.value as TCheckStats,
        };
      }

      return {
        endpoint,
        success: false,
        error: result.reason instanceof Error ? result.reason : new Error(result.reason),
        stats: undefined,
      };
    });

    const resultsByEndpoint = results.reduce(
      (acc, result, index) => {
        acc[endpoints[index]] = result;
        return acc;
      },
      {} as Record<string, CheckResult<TCheckStats>>
    );

    this.state.checkStats.push({
      timestamp: checkTimestamp,
      results: resultsByEndpoint,
    });

    if (this.state.checkStats.length > this.params.maxStoredCheckStats) {
      this.state.checkStats.shift();
    }
  }

  shouldTrack({ warmUp = false }: { warmUp?: boolean } = {}) {
    const hasMultipleEndpoints = this.getEndpoints().length > 1;

    const isUnused =
      !this.state.lastUsage ||
      differenceInMilliseconds(Date.now(), this.state.lastUsage) > this.params.disableUnusedTrackingTimeout;

    return hasMultipleEndpoints && (warmUp || !isUnused);
  }

  loadEndpointsState(validEndpoints: string[]) {
    const stored = localStorage.getItem(this.trackerKey);

    if (!stored) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(stored) as StoredEndpointsState;

      const primary = parsed.primary;
      const secondary = parsed.secondary;

      if (!primary || !secondary || !validEndpoints.includes(primary) || !validEndpoints.includes(secondary)) {
        throw new Error("Invalid endpoints state");
      }

      if (Date.now() - parsed.timestamp > this.params.cacheTimeout) {
        return undefined;
      }

      return {
        primary,
        secondary,
      };
    } catch (error) {
      return undefined;
    }
  }

  saveEndpointsState({ primary, secondary }: { primary: string; secondary: string }) {
    const state: StoredEndpointsState = {
      primary,
      secondary,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(this.trackerKey, JSON.stringify(state));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to save endpoints state to localStorage", error);
      return;
    }
  }
}
