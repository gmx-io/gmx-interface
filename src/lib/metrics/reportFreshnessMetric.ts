import throttle from "lodash/throttle";

import { CONTRACTS_CHAIN_IDS } from "config/chains";
import { LRUCache } from "sdk/utils/LruCache";

import { metrics } from "./Metrics";
import { FreshnessMetricId, FreshnessTiming } from "./types";

const CACHE_SIZE = CONTRACTS_CHAIN_IDS.length * Object.keys(FreshnessMetricId).length;

class FreshnessMetrics {
  state = {
    cache: undefined as LRUCache<number> | undefined,
    throttledFunctions: new Map<string, ReturnType<typeof throttle>>(),
    enabled: false,
  };

  static _instance: FreshnessMetrics;

  static get instance() {
    if (!FreshnessMetrics._instance) {
      FreshnessMetrics._instance = new FreshnessMetrics();
    }
    return FreshnessMetrics._instance;
  }

  getCacheKey = (chainId: number, metricId: FreshnessMetricId) => {
    return `${chainId}.${metricId}`;
  };

  getOrCreateCache = (): LRUCache<number> => {
    if (!this.state.cache) {
      this.state.cache = new LRUCache<number>(CACHE_SIZE);
    }
    return this.state.cache;
  };

  _reportFreshnessMetric = (chainId: number, metricId: FreshnessMetricId) => {
    const cache = this.getOrCreateCache();
    const now = Date.now();
    const cacheKey = this.getCacheKey(chainId, metricId);

    const lastUpdated = cache.get(cacheKey);

    if (!lastUpdated) {
      cache.set(cacheKey, now);
      return;
    }

    const diff = now - lastUpdated;

    cache.set(cacheKey, now);

    metrics.pushTiming<FreshnessTiming>(`freshness.${metricId}`, diff, {
      chainId,
      metricId,
    });
  };

  public reportThrottled = (chainId: number, metricId: FreshnessMetricId) => {
    if (!this.state.enabled) {
      return;
    }

    const cacheKey = this.getCacheKey(chainId, metricId);

    let throttled = this.state.throttledFunctions.get(cacheKey);
    if (!throttled) {
      throttled = throttle(() => this._reportFreshnessMetric(chainId, metricId), 100, {
        leading: true,
        trailing: false,
      });
      this.state.throttledFunctions.set(cacheKey, throttled);
    }

    throttled();
  };

  public clear = (chainId: number, metricId: FreshnessMetricId) => {
    const cache = this.getOrCreateCache();
    const cacheKey = this.getCacheKey(chainId, metricId);

    cache.delete(cacheKey);

    const throttled = this.state.throttledFunctions.get(cacheKey);
    if (throttled) {
      throttled.cancel();
      this.state.throttledFunctions.delete(cacheKey);
    }
  };

  public clearAll = () => {
    if (!this.state.cache) {
      return;
    }

    this.state.cache.clean();
    // Cancel all throttled functions
    for (const throttled of this.state.throttledFunctions.values()) {
      throttled.cancel();
    }

    this.state.throttledFunctions.clear();
  };

  public setEnabled = (enabled: boolean) => {
    this.state.enabled = enabled;
  };

  public isEnabled = (): boolean => {
    return this.state.enabled;
  };

  public getLastUpdated = (chainId: number, metricId: FreshnessMetricId): number | undefined => {
    if (!this.state.cache) {
      return undefined;
    }

    const cacheKey = this.getCacheKey(chainId, metricId);
    const lastUpdated = this.state.cache.get(cacheKey);

    return lastUpdated;
  };
}

export const freshnessMetrics = FreshnessMetrics.instance;
