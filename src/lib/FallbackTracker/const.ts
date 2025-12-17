import { FallbackTrackerConfig } from "./FallbackTracker";

export const STABILITY_WEIGHT = 0.7;
export const SPEED_WEIGHT = 0.5;

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

export const STORED_CHECK_STATS_MAX_COUNT = 10;
