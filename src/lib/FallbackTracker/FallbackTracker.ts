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

const STORED_CHECK_STATS_MAX_COUNT = 1;

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

  // Default secondary endpoint
  secondary: string;

  // All endpoints to track
  endpoints: string[];

  // Check endpoint implementation
  checkEndpoint: (endpoint: string, signal: AbortSignal) => Promise<TCheckResult>;

  // Ranking implementation for primary endpoint
  selectNextPrimary: (params: {
    endpointsStats: EndpointStats<TCheckResult>[];
    primary: string;
    secondary: string;
  }) => string | undefined;

  // Ranking implementation for secondary endpoint
  selectNextSecondary: (params: {
    endpointsStats: EndpointStats<TCheckResult>[];
    primary: string;
    secondary: string;
  }) => string | undefined;

  getEndpointName?: (endpoint: string) => string | undefined;
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
  startDelayTimeoutId: number | undefined;
  abortController: AbortController | undefined;
  setEndpointsThrottleTimeout: number | undefined;
  pendingEndpoints: { primary: string; secondary: string } | undefined;
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
  checkResult: CheckResult<TCheckStats> | undefined;
};

export type StoredState = {
  primary: string;
  secondary: string;
  timestamp: number;
  cachedEndpointsState: {
    [endpoint: string]: Pick<EndpointState, "banned">;
  };
};

export type CurrentEndpoints = {
  primary: string;
  secondary: string;
  fallbacks: string[];
  trackerKey: string;
};

export class FallbackTracker<TCheckStats> {
  state: FallbackTrackerState<TCheckStats>;

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

    const endpoints = uniq([this.params.primary, this.params.secondary, ...this.params.endpoints]);

    const stored = this.loadStorage(endpoints);

    if (stored) {
      primary = stored.primary;
      secondary = stored.secondary;
    }

    const cachedEndpointsState = stored?.cachedEndpointsState ?? {};

    this.state = {
      primary,
      secondary,
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

    const lastCheckResults = this.getLastCheckResults();

    return {
      ...state,
      checkResult: lastCheckResults?.[endpoint] ?? undefined,
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
      secondary: this.state.secondary,
      cachedEndpointsState: this.getCachedEndpointsState(),
    });

    emitEndpointBanned({ endpoint, reason, trackerKey: this.trackerKey });

    this.warn(`Ban endpoint "${endpoint}" with reason "${reason}"`);

    const keepPrimary = this.state.primary !== endpoint;
    const keepSecondary = this.state.secondary !== endpoint;

    // Avoid switching not banned endpoints.
    this.selectBestEndpoints({ keepPrimary, keepSecondary });
  };

  public getCurrentEndpoints = (): CurrentEndpoints => {
    this.state.lastUsage = Date.now();

    return {
      primary: this.state.primary,
      secondary: this.state.secondary,
      fallbacks: this.params.endpoints.filter(
        (endpoint) => endpoint !== this.state.primary && endpoint !== this.state.secondary
      ),
      trackerKey: this.trackerKey,
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
  }

  public track({ warmUp = false } = {}) {
    if (this.state.trackerTimeoutId) {
      clearTimeout(this.state.trackerTimeoutId);
      this.state.trackerTimeoutId = undefined;
    }

    // Schedule next track call if not tracking
    if (!this.shouldTrack({ warmUp })) {
      this.state.trackerTimeoutId = window.setTimeout(() => this.track(), this.params.trackInterval);
      return;
    }

    this.checkEndpoints()
      .then(() => {
        emitTrackingFinished({ trackerKey: this.trackerKey, endpointsStats: this.getEndpointsStats() });
        this.selectBestEndpoints();
      })
      .finally(() => {
        this.state.trackerTimeoutId = window.setTimeout(() => this.track(), this.params.trackInterval);
      });
  }

  public cleanup() {
    this.state.cleanupEvents();

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

  selectBestEndpoints = ({
    keepPrimary = false,
    keepSecondary = false,
  }: { keepPrimary?: boolean; keepSecondary?: boolean } = {}) => {
    if (this.params.endpoints.length === 1) {
      this.state.primary = this.params.endpoints[0];
      this.state.secondary = this.params.endpoints[0];
      return;
    }

    const endpointsStats = this.getEndpointsStats();

    const statsForPrimary = keepSecondary
      ? endpointsStats.filter((s) => s.endpoint !== this.state.secondary)
      : endpointsStats;

    let nextPrimary: string | undefined = this.state.primary;
    if (!keepPrimary) {
      try {
        nextPrimary =
          this.params.selectNextPrimary({
            endpointsStats: statsForPrimary,
            primary: this.state.primary,
            secondary: this.state.secondary,
          }) ?? nextPrimary;
      } catch (error) {
        this.warn(`Error in selectNextPrimary: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const statsForSecondary = endpointsStats.filter((s) => s.endpoint !== nextPrimary);

    let nextSecondary: string | undefined = this.state.secondary;

    if (!keepSecondary) {
      try {
        nextSecondary =
          this.params.selectNextSecondary({
            endpointsStats: statsForSecondary,
            primary: this.state.primary,
            secondary: this.state.secondary,
          }) ?? nextSecondary;
      } catch (error) {
        this.warn(`Error in selectNextSecondary: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    this.setCurrentEndpoints(nextPrimary, nextSecondary);
  };

  setCurrentEndpoints(primary: string, secondary: string) {
    if (primary === this.state.primary && secondary === this.state.secondary) {
      return;
    }

    const applyEndpoints = (primary: string, secondary: string) => {
      this.state.primary = primary;
      this.state.secondary = secondary;

      this.saveStorage({
        primary: primary,
        secondary: secondary,
        cachedEndpointsState: this.getCachedEndpointsState(),
      });

      emitEndpointsUpdated({
        trackerKey: this.trackerKey,
        primary: primary,
        secondary: secondary,
        endpointsStats: this.getEndpointsStats(),
      });

      this.state.pendingEndpoints = undefined;
    };

    // Throttle with trailing edge: process immediately on first call
    if (!this.state.setEndpointsThrottleTimeout) {
      applyEndpoints(primary, secondary);

      this.state.setEndpointsThrottleTimeout = window.setTimeout(() => {
        // Trailing edge: process last endpoints if there was a call during throttle period
        if (this.state.pendingEndpoints) {
          applyEndpoints(this.state.pendingEndpoints.primary, this.state.pendingEndpoints.secondary);
        }

        this.state.setEndpointsThrottleTimeout = undefined;
      }, this.params.setEndpointsThrottle);
      return;
    }

    // During throttle period: save endpoints for trailing edge processing
    this.state.pendingEndpoints = { primary, secondary };
  }

  async checkEndpoints() {
    const checkTimestamp = Date.now();
    const endpoints = this.params.endpoints;

    // Abort any pending checks.
    if (this.state.abortController) {
      this.state.abortController.abort();
    }

    const globalAbortController = new AbortController();
    this.state.abortController = globalAbortController;

    const results = await Promise.allSettled(
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
    ).then((checkResults) => {
      return checkResults
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
    });

    this.state.checkStats.push({
      results,
      timestamp: checkTimestamp,
    });

    if (this.state.checkStats.length > STORED_CHECK_STATS_MAX_COUNT) {
      this.state.checkStats.shift();
    }

    return results;
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
      const secondary = parsed.secondary;

      if (
        !primary ||
        !secondary ||
        !validEndpoints.includes(primary) ||
        !validEndpoints.includes(secondary) ||
        Object.keys(parsed.cachedEndpointsState).some((endpoint) => !validEndpoints.includes(endpoint))
      ) {
        throw new Error("Invalid endpoints state");
      }

      return {
        primary,
        secondary,
        timestamp: parsed.timestamp,
        cachedEndpointsState: parsed.cachedEndpointsState,
      };
    } catch (error) {
      return undefined;
    }
  }

  saveStorage({ primary, secondary, cachedEndpointsState }: Omit<StoredState, "timestamp">) {
    const state: StoredState = {
      primary,
      secondary,
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
