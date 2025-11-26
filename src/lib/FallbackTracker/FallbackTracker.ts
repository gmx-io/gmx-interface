import { differenceInMilliseconds } from "date-fns";

import { getFallbackTrackerKey } from "config/localStorage";
import { ErrorLike } from "lib/errors";
import { emitMetricEvent } from "lib/metrics/emitMetricEvent";
import type { FallbackTrackerBannedEvent } from "lib/metrics/types";
import { sleepWithSignal } from "lib/sleep";
import { combineAbortSignals } from "sdk/utils/abort";

import {
  emitFallbackTrackerEndpointsUpdated,
  emitFallbackTrackerTrackFinished,
  onFallbackTrackerEvent,
} from "./events";

export const DEFAULT_FALLBACK_TRACKER_CONFIG = {
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
    throttle: number;
  };

  /** Maximum number of check stats to store */
  maxStoredCheckStats: number;

  /** Throttle for setCurrentEndpoints calls */
  setEndpointsThrottle: number;

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
  abortController: AbortController | undefined;
  setEndpointsThrottleTimeout: number | undefined;
  pendingEndpoints: { primary: string; secondary: string } | undefined;
  unsubscribeFromIncomingEvents: () => void;
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

    const stored = this.loadStorage(this.params.endpoints);

    if (stored) {
      primary = stored.primary;
      secondary = stored.secondary;
    }

    const cachedEndpointsState = stored?.cachedEndpointsState ?? {};

    this.state = {
      primary,
      secondary,
      lastUsage: undefined,
      endpointsState: this.params.endpoints.reduce(
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
      abortController: undefined,
      setEndpointsThrottleTimeout: undefined,
      pendingEndpoints: undefined,
      unsubscribeFromIncomingEvents: this.subscribeToIncomingEvents(),
    };
  }

  get trackerKey() {
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

  public triggerFailure = (endpoint: string) => {
    const endpointState = this.state.endpointsState[endpoint];

    if (!endpointState) {
      this.warn(`Trigger failure for invalid endpoint "${endpoint}"`);
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

    emitMetricEvent<FallbackTrackerBannedEvent>({
      event: "fallbackTracker.endpoint.banned",
      isError: false,
      data: {
        key: this.trackerKey,
        endpoint: this.params.getEndpointName?.(endpoint) ?? endpoint,
        reason,
      },
    });

    this.warn(`Ban endpoint "${endpoint}" with reason "${reason}"`);

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
        emitFallbackTrackerTrackFinished({ trackerKey: this.trackerKey });
        this.selectBestEndpoints();
      })
      .finally(() => {
        this.state.trackerTimeoutId = window.setTimeout(() => this.track(), this.params.trackInterval);
      });
  }

  public stopTracking() {
    this.state.unsubscribeFromIncomingEvents();

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

      emitFallbackTrackerEndpointsUpdated({
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

  subscribeToIncomingEvents() {
    return onFallbackTrackerEvent("triggerFailure", ({ trackerKey, endpoint }) => {
      if (trackerKey === this.trackerKey) {
        this.triggerFailure(endpoint);
      }
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
    const stored = localStorage.getItem(this.trackerKey);

    if (!stored) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(stored) as StoredState | { primary: string; secondary: string; timestamp: number };

      const primary = parsed.primary;
      const secondary = parsed.secondary;

      if (!primary || !secondary || !validEndpoints.includes(primary) || !validEndpoints.includes(secondary)) {
        throw new Error("Invalid endpoints state");
      }

      if (Date.now() - parsed.timestamp > this.params.cacheTimeout) {
        return undefined;
      }

      // Handle backward compatibility: old format doesn't have cachedEndpointsState
      const cachedEndpointsState: StoredState["cachedEndpointsState"] = {};
      if ("cachedEndpointsState" in parsed && parsed.cachedEndpointsState) {
        // Filter out endpoints that are no longer valid
        for (const endpoint of validEndpoints) {
          if (parsed.cachedEndpointsState[endpoint]) {
            cachedEndpointsState[endpoint] = parsed.cachedEndpointsState[endpoint];
          }
        }
      }

      return {
        primary,
        secondary,
        timestamp: parsed.timestamp,
        cachedEndpointsState,
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
      localStorage.setItem(this.trackerKey, JSON.stringify(state));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to save storage to localStorage", error);
      return;
    }
  }
}
