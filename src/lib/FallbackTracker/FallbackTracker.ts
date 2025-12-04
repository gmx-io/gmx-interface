import { differenceInMilliseconds } from "date-fns";
import uniq from "lodash/uniq";

import { getFallbackTrackerKey } from "config/localStorage";
import { ErrorLike } from "lib/errors";
import { sleepWithSignal } from "lib/sleep";
import { combineAbortSignals } from "sdk/utils/abort";

import {
  addFallbackTrackerListenner,
  emitEndpointBanned,
  emitEndpointsUpdated,
  emitReportEndpointFailure,
  emitTrackingFinished,
} from "./events";
import { NetworkStatusObserver } from "./NetworkStatusObserver";

export const DEFAULT_FALLBACK_TRACKER_CONFIG: FallbackTrackerConfig = {
  trackInterval: 10 * 1000, // 10 seconds
  checkTimeout: 10 * 1000, // 10 seconds
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  disableUnusedTrackingTimeout: 1 * 60 * 1000, // 1 minute
  failuresBeforeBan: {
    count: 3, // 3 failures
    window: 60 * 1000, // 1 minute
    throttle: 2 * 1000, // 2 seconds
  },
  setEndpointsThrottle: 5 * 1000, // 5 seconds
  delay: 5000, // Delay before starting tracking (in milliseconds)
};

const STORED_CHECK_STATS_MAX_COUNT = 10;

export type FallbackTrackerConfig = {
  // Frequency of endpoint probing
  trackInterval: number;

  // Pause probing if no requests for the best endpoint for this time
  disableUnusedTrackingTimeout: number;

  // Time after which endpoint saved in the localStorage is considered stale
  cacheTimeout: number;

  // Abort endpoint probe if it takes longer
  checkTimeout: number;

  failuresBeforeBan: {
    // Number of failures before banning endpoint
    count: number;
    // Time window for counting failures
    window: number;
    // Throttle for counting failures
    throttle: number;
  };

  // Throttle for setCurrentEndpoints calls
  setEndpointsThrottle: number;

  // Delay before starting tracking (in milliseconds)
  delay?: number;
};

export type FallbackTrackerParams<TCheckResult> = FallbackTrackerConfig & {
  // Storage key for endpoints state
  trackerKey: string;

  // Default primary endpoint
  primary: string;

  // All endpoints to track
  endpoints: string[];

  // Check endpoint implementation
  checkEndpoint: (endpoint: string, signal: AbortSignal) => Promise<TCheckResult>;

  // Ranking implementation for primary endpoint
  selectNextPrimary: (params: { endpointsStats: EndpointStats<TCheckResult>[]; primary: string }) => string | undefined;

  selectNextFallbacks: (params: {
    endpointsStats: EndpointStats<TCheckResult>[];
    primary: string;
  }) => string[] | undefined;

  getEndpointName?: (endpoint: string) => string | undefined;

  networkStatusObserver: NetworkStatusObserver;
};

export type FallbackTrackerState<TCheckStats> = {
  primary: string;
  fallbacks: string[];
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
  startDelayTimeoutId: number | undefined;
  abortController: AbortController | undefined;
  setEndpointsThrottleTimeout: number | undefined;
  pendingEndpoints: { primary: string; fallbacks: string[] } | undefined;
  cleanupEvents: () => void;
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
  failureThrottleTimeout: number | undefined;
};

export type CheckResult<TCheckStats> = {
  endpoint: string;
  success: boolean;
  error?: ErrorLike;
  stats: TCheckStats | undefined;
};

export type EndpointStats<TCheckStats> = EndpointState & {
  checkResults: CheckResult<TCheckStats>[];
};

export type StoredState = {
  primary: string;
  fallbacks: string[];
  timestamp: number;
  cachedEndpointsState: {
    [endpoint: string]: Pick<EndpointState, "banned">;
  };
};

export type CurrentEndpoints<TCheckStats> = {
  primary: string;
  fallbacks: string[];
  trackerKey: string;
  endpointsStats: EndpointStats<TCheckStats>[];
};

export class FallbackTracker<TCheckStats> {
  state: FallbackTrackerState<TCheckStats>;
  private readonly networkStatusObserver: NetworkStatusObserver;

  constructor(public readonly params: FallbackTrackerParams<TCheckStats>) {
    this.networkStatusObserver = params.networkStatusObserver;

    let primary = this.params.primary;

    if (!this.params.endpoints.length) {
      throw new Error("No endpoints provided");
    }

    if (!this.params.endpoints.includes(this.params.primary)) {
      throw new Error("Primary endpoint is not in endpoints list");
    }

    const endpoints = uniq([this.params.primary, ...this.params.endpoints]);

    const stored = this.loadStorage(endpoints);

    if (stored) {
      primary = stored.primary;
    }

    const cachedEndpointsState = stored?.cachedEndpointsState ?? {};
    const fallbacks = stored?.fallbacks ?? this.params.endpoints.filter((endpoint) => endpoint !== primary);

    this.state = {
      primary,
      fallbacks,
      lastUsage: undefined,
      endpointsState: endpoints.reduce(
        (acc, endpoint) => {
          acc[endpoint] = {
            endpoint,
            failureTimestamps: [],
            banned: cachedEndpointsState[endpoint]?.banned,
            failureThrottleTimeout: undefined,
          };
          return acc;
        },
        {} as Record<string, EndpointState>
      ),
      checkStats: [],
      trackerTimeoutId: undefined,
      startDelayTimeoutId: undefined,
      abortController: undefined,
      setEndpointsThrottleTimeout: undefined,
      pendingEndpoints: undefined,
      cleanupEvents: this.selfSubscribe(),
    };
  }

  get trackerKey() {
    return this.params.trackerKey;
  }

  get storageKey() {
    return getFallbackTrackerKey(this.params.trackerKey);
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

    const startWindow = Date.now() - this.params.trackInterval * STORED_CHECK_STATS_MAX_COUNT;

    return {
      ...state,
      checkResults: this.state.checkStats
        // Filter out old too old check stats
        .filter((checkStat) => checkStat.timestamp >= startWindow)
        .map((checkStat) => checkStat.results[endpoint])
        .filter((checkResult): checkResult is CheckResult<TCheckStats> => checkResult !== undefined),
    };
  }

  getEndpointsStats(): EndpointStats<TCheckStats>[] {
    return this.params.endpoints
      .map((endpoint) => this.getEndpointStats(endpoint))
      .filter((s): s is EndpointStats<TCheckStats> => s !== undefined);
  }

  public reportFailure = (endpoint: string) => {
    emitReportEndpointFailure({
      endpoint,
      trackerKey: this.trackerKey,
    });
  };

  handleFailure = (endpoint: string) => {
    if (this.networkStatusObserver.getIsGlobalNetworkDown()) {
      return;
    }

    const endpointState = this.state.endpointsState[endpoint];

    if (!endpointState) {
      this.warn(`Report failure for invalid endpoint "${endpoint}"`);
      return;
    }

    if (this.params.failuresBeforeBan.throttle !== 0 && endpointState.failureThrottleTimeout) {
      return;
    }

    endpointState.failureThrottleTimeout = window.setTimeout(() => {
      endpointState.failureThrottleTimeout = undefined;
    }, this.params.failuresBeforeBan.throttle);

    const now = Date.now();

    endpointState.failureTimestamps.push(now);

    const windowStart = now - this.params.failuresBeforeBan.window;
    endpointState.failureTimestamps = endpointState.failureTimestamps.filter((timestamp) => timestamp >= windowStart);

    const failureCount = endpointState.failureTimestamps.length;

    if (failureCount >= this.params.failuresBeforeBan.count) {
      this.banEndpoint(endpoint, "Banned by failures threshold");
    }
  };

  public banEndpoint = (endpoint: string, reason: string) => {
    if (this.networkStatusObserver.getIsGlobalNetworkDown()) {
      return;
    }

    const endpointState = this.state.endpointsState[endpoint];

    if (!endpointState) {
      this.warn(`Ban invalid endpoint "${endpoint}"`);
      return;
    }

    endpointState.banned = {
      timestamp: Date.now(),
      reason,
    };

    this.saveStorage({
      primary: this.state.primary,
      fallbacks: this.state.fallbacks,
      cachedEndpointsState: this.getCachedEndpointsState(),
    });

    emitEndpointBanned({ endpoint, reason, trackerKey: this.trackerKey });

    this.warn(`Ban endpoint "${endpoint}" with reason "${reason}"`);

    const keepPrimary = this.state.primary !== endpoint;

    // Avoid switching not banned endpoints.
    this.selectBestEndpoints({ keepPrimary });
  };

  public getCurrentEndpoints = (): CurrentEndpoints<TCheckStats> => {
    this.state.lastUsage = Date.now();

    return {
      primary: this.state.primary,
      fallbacks: this.state.fallbacks,
      trackerKey: this.trackerKey,
      endpointsStats: this.getEndpointsStats(),
    };
  };

  public startTracking() {
    const delay = this.params.delay ?? 0;

    if (delay > 0) {
      this.state.startDelayTimeoutId = window.setTimeout(() => {
        this.state.startDelayTimeoutId = undefined;
        this.track({ warmUp: true });
      }, delay);
    } else {
      this.track({ warmUp: true });
    }
  }

  public stopTracking() {
    if (this.state.trackerTimeoutId) {
      clearTimeout(this.state.trackerTimeoutId);
      this.state.trackerTimeoutId = undefined;
    }

    if (this.state.startDelayTimeoutId) {
      clearTimeout(this.state.startDelayTimeoutId);
      this.state.startDelayTimeoutId = undefined;
    }

    if (this.state.abortController) {
      this.state.abortController.abort();
      this.state.abortController = undefined;
    }

    this.networkStatusObserver.setActive(this.trackerKey, false);
  }

  public track({ warmUp = false } = {}) {
    if (this.state.trackerTimeoutId) {
      clearTimeout(this.state.trackerTimeoutId);
      this.state.trackerTimeoutId = undefined;
    }

    // Schedule next track call if not tracking
    if (!this.shouldTrack({ warmUp })) {
      this.networkStatusObserver.setActive(this.trackerKey, false);
      this.state.trackerTimeoutId = window.setTimeout(() => this.track(), this.params.trackInterval);
      return;
    }

    this.networkStatusObserver.setActive(this.trackerKey, true);

    if (this.state.abortController) {
      this.state.abortController.abort();
    }

    const abortController = new AbortController();
    this.state.abortController = abortController;

    this.checkEndpoints(abortController)
      .then(() => {
        emitTrackingFinished({ trackerKey: this.trackerKey, endpointsStats: this.getEndpointsStats() });
        this.selectBestEndpoints();
      })
      .finally(() => {
        if (this.state.abortController === abortController && this.state.trackerTimeoutId === undefined) {
          this.state.trackerTimeoutId = window.setTimeout(() => this.track(), this.params.trackInterval);
        }
      });
  }

  public cleanup() {
    this.state.cleanupEvents();

    this.networkStatusObserver.setActive(this.trackerKey, false);

    // Clear start delay timeout
    if (this.state.startDelayTimeoutId) {
      clearTimeout(this.state.startDelayTimeoutId);
      this.state.startDelayTimeoutId = undefined;
    }

    // Abort any pending probes.
    if (this.state.trackerTimeoutId) {
      clearTimeout(this.state.trackerTimeoutId);
      this.state.trackerTimeoutId = undefined;
    }

    if (this.state.abortController) {
      this.state.abortController.abort();
      this.state.abortController = undefined;
    }

    // Clear failure throttles
    Object.values(this.state.endpointsState).forEach((endpointState) => {
      if (endpointState.failureThrottleTimeout) {
        clearTimeout(endpointState.failureThrottleTimeout);
        endpointState.failureThrottleTimeout = undefined;
      }
    });

    // Clear setEndpoints throttle
    if (this.state.setEndpointsThrottleTimeout) {
      clearTimeout(this.state.setEndpointsThrottleTimeout);
      this.state.setEndpointsThrottleTimeout = undefined;
    }

    this.state.pendingEndpoints = undefined;
  }

  selectBestEndpoints = ({ keepPrimary = false }: { keepPrimary?: boolean } = {}) => {
    if (this.params.endpoints.length === 1) {
      this.state.primary = this.params.endpoints[0];
      this.state.fallbacks = [];
      return;
    }

    const endpointsStats = this.getEndpointsStats();

    let nextPrimary: string | undefined = this.state.primary;
    if (!keepPrimary) {
      try {
        nextPrimary =
          this.params.selectNextPrimary({
            endpointsStats,
            primary: nextPrimary,
          }) ?? nextPrimary;
      } catch (error) {
        this.warn(`Error in selectNextPrimary: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const statsForFallbacks = endpointsStats.filter((s) => s.endpoint !== nextPrimary);

    let nextFallbacks: string[] = this.state.fallbacks;
    try {
      nextFallbacks =
        this.params.selectNextFallbacks({
          endpointsStats: statsForFallbacks,
          primary: nextPrimary,
        }) ?? nextFallbacks;
    } catch (error) {
      this.warn(`Error in selectNextFallbacks: ${error instanceof Error ? error.message : String(error)}`);
    }

    this.setCurrentEndpoints(nextPrimary, nextFallbacks);
  };

  setCurrentEndpoints(primary: string, fallbacks: string[]) {
    if (
      primary === this.state.primary &&
      fallbacks.length === this.state.fallbacks.length &&
      fallbacks.every((fallback, index) => fallback === this.state.fallbacks[index])
    ) {
      return;
    }

    const applyEndpoints = (primary: string, fallbacks: string[]) => {
      this.state.primary = primary;
      this.state.fallbacks = fallbacks;

      this.saveStorage({
        primary: primary,
        fallbacks: fallbacks,
        cachedEndpointsState: this.getCachedEndpointsState(),
      });

      emitEndpointsUpdated({
        trackerKey: this.trackerKey,
        primary: primary,
        fallbacks: fallbacks,
        endpointsStats: this.getEndpointsStats(),
      });

      this.state.pendingEndpoints = undefined;
    };

    // Throttle with trailing edge: process immediately on first call
    if (!this.state.setEndpointsThrottleTimeout) {
      applyEndpoints(primary, fallbacks);

      this.state.setEndpointsThrottleTimeout = window.setTimeout(() => {
        // Trailing edge: process last endpoints if there was a call during throttle period
        if (this.state.pendingEndpoints) {
          applyEndpoints(this.state.pendingEndpoints.primary, this.state.pendingEndpoints.fallbacks);
        }

        this.state.setEndpointsThrottleTimeout = undefined;
      }, this.params.setEndpointsThrottle);
      return;
    }

    // During throttle period: save endpoints for trailing edge processing
    this.state.pendingEndpoints = { primary, fallbacks };
  }

  async checkEndpoints(abortController: AbortController) {
    const checkTimestamp = Date.now();
    const endpoints = this.params.endpoints;

    const checkResults = await Promise.allSettled(
      endpoints.map((endpoint) => {
        const timeoutController = new AbortController();
        const combinedController = combineAbortSignals(abortController.signal, timeoutController.signal);

        return Promise.race([
          sleepWithSignal(this.params.checkTimeout, combinedController.signal).then(() => {
            timeoutController.abort();
            throw new Error("Check timeout");
          }),
          this.params.checkEndpoint(endpoint, combinedController.signal),
        ]);
      })
    );

    const fulfilledResults = checkResults.filter((result) => result.status === "fulfilled");

    if (fulfilledResults.length === 0) {
      this.networkStatusObserver.setTrackingFailed(this.trackerKey, true);
    } else {
      this.networkStatusObserver.setTrackingFailed(this.trackerKey, false);
    }

    const resultsMap = checkResults
      .map((result, index): CheckResult<TCheckStats> => {
        return {
          endpoint: endpoints[index],
          success: result.status === "fulfilled",
          stats: result.status === "fulfilled" ? (result.value as TCheckStats) : undefined,
          error: result.status === "rejected" ? result.reason : undefined,
        };
      })
      .reduce(
        (acc, result) => {
          acc[result.endpoint] = result;
          return acc;
        },
        {} as Record<string, CheckResult<TCheckStats>>
      );

    this.state.checkStats.push({
      results: resultsMap,
      timestamp: checkTimestamp,
    });

    if (this.state.checkStats.length > STORED_CHECK_STATS_MAX_COUNT) {
      this.state.checkStats.shift();
    }

    return resultsMap;
  }

  shouldTrack({ warmUp = false }: { warmUp?: boolean } = {}) {
    const hasMultipleEndpoints = this.params.endpoints.length > 1;

    const isUnused =
      !this.state.lastUsage ||
      differenceInMilliseconds(Date.now(), this.state.lastUsage) > this.params.disableUnusedTrackingTimeout;

    return hasMultipleEndpoints && (warmUp || !isUnused);
  }

  selfSubscribe() {
    return addFallbackTrackerListenner("reportEndpointFailure", this.trackerKey, ({ endpoint }) => {
      this.handleFailure(endpoint);
    });
  }

  getCachedEndpointsState(): StoredState["cachedEndpointsState"] {
    return Object.entries(this.state.endpointsState).reduce(
      (acc, [endpoint, state]) => {
        if (state.banned) {
          acc[endpoint] = { banned: state.banned };
        }
        return acc;
      },
      {} as StoredState["cachedEndpointsState"]
    );
  }

  loadStorage(validEndpoints: string[]): StoredState | undefined {
    const stored = localStorage.getItem(this.storageKey);

    if (!stored) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(stored) as StoredState;

      if (Date.now() - parsed.timestamp > this.params.cacheTimeout) {
        return undefined;
      }

      const primary = parsed.primary;
      const fallbacks = parsed.fallbacks || [];

      if (
        !primary ||
        !Array.isArray(fallbacks) ||
        !validEndpoints.includes(primary) ||
        fallbacks.some((endpoint) => !validEndpoints.includes(endpoint)) ||
        Object.keys(parsed.cachedEndpointsState).some((endpoint) => !validEndpoints.includes(endpoint))
      ) {
        throw new Error("Invalid endpoints state");
      }

      return {
        primary,
        fallbacks,
        timestamp: parsed.timestamp,
        cachedEndpointsState: parsed.cachedEndpointsState,
      };
    } catch (error) {
      return undefined;
    }
  }

  saveStorage({ primary, fallbacks, cachedEndpointsState }: Omit<StoredState, "timestamp">) {
    const state: StoredState = {
      primary,
      fallbacks,
      timestamp: Date.now(),
      cachedEndpointsState,
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to save storage to localStorage", error);
      return;
    }
  }
}
