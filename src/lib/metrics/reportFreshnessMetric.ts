import throttle from "lodash/throttle";

import { CONTRACTS_CHAIN_IDS } from "config/chains";
import { LRUCache } from "sdk/utils/LruCache";

import { metrics } from "./Metrics";
import { FreshnessMetricId, FreshnessTiming } from "./types";

const CACHE_SIZE = CONTRACTS_CHAIN_IDS.length * Object.keys(FreshnessMetricId).length;
// Key Format: `${chainId}.${metricId}`
const lastUpdatedCache = new LRUCache<number>(CACHE_SIZE);

function getCacheKey(chainId: number, metricId: FreshnessMetricId) {
  return `${chainId}.${metricId}`;
}

function _reportFreshnessMetric(chainId: number, metricId: FreshnessMetricId) {
  const now = Date.now();
  const cacheKey = getCacheKey(chainId, metricId);

  const lastUpdated = lastUpdatedCache.get(cacheKey);

  if (!lastUpdated) {
    lastUpdatedCache.set(cacheKey, now);
    return;
  }

  const diff = now - lastUpdated;

  lastUpdatedCache.set(cacheKey, now);

  metrics.pushTiming<FreshnessTiming>(`freshness.${metricId}`, diff, {
    chainId,
    metricId,
  });
}

// Workaround: create a throttle for each key (chainId + metricId) to handle calling from different instances of hooks
const throttledFunctions = new Map<string, ReturnType<typeof throttle>>();

export function reportFreshnessMetricThrottled(chainId: number, metricId: FreshnessMetricId) {
  const cacheKey = getCacheKey(chainId, metricId);

  let throttled = throttledFunctions.get(cacheKey);
  if (!throttled) {
    throttled = throttle(() => _reportFreshnessMetric(chainId, metricId), 100, { leading: true, trailing: false });
    throttledFunctions.set(cacheKey, throttled);
  }

  throttled();
}

export function clearFreshnessCache(chainId: number, metricId: FreshnessMetricId) {
  const cacheKey = getCacheKey(chainId, metricId);
  lastUpdatedCache.delete(cacheKey);
  // Also cancel any pending throttled calls
  const throttled = throttledFunctions.get(cacheKey);
  if (throttled) {
    throttled.cancel();
    throttledFunctions.delete(cacheKey);
  }
}
