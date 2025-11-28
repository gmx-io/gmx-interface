import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getFallbackTrackerKey } from "config/localStorage";
import { suppressConsole } from "lib/__testUtils__/_utils";
import { metrics } from "lib/metrics";
import { ARBITRUM } from "sdk/configs/chains";
import * as oracleKeeperConfig from "sdk/configs/oracleKeeper";

import { failsPerMinuteToFallback, OracleKeeperFetcher } from "../oracleKeeperFetcher";

vi.mock("lib/metrics", () => ({
  metrics: {
    pushCounter: vi.fn(),
  },
  OracleKeeperMetricMethodId: {},
}));

describe("OracleKeeperFetcher Fallback Logic", () => {
  suppressConsole();

  const chainId = ARBITRUM;
  const mainUrl = oracleKeeperConfig.getOracleKeeperUrl(chainId);

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("should initialize with main URL when no stored fallback state exists", () => {
    const fetcher = new OracleKeeperFetcher({ chainId });
    expect(fetcher.url).toBe(mainUrl);
  });

  test("should initialize with stored fallback URL if valid", () => {
    const fallbackUrls = oracleKeeperConfig.getOracleKeeperFallbackUrls(chainId);
    const storedFallback = fallbackUrls[0];
    const trackerKey = `OracleFallbackTracker:${chainId}`;
    const state = {
      primary: storedFallback,
      secondary: mainUrl,
      timestamp: Date.now(),
      cachedEndpointsState: {},
    };
    localStorage.setItem(getFallbackTrackerKey(trackerKey), JSON.stringify(state));

    const fetcher = new OracleKeeperFetcher({ chainId });
    expect(fetcher.url).toBe(storedFallback);
  });

  test("should ignore stored fallback URL if not in allowed list", () => {
    const invalidFallback = "https://evil.com";
    const trackerKey = `OracleFallbackTracker:${chainId}`;
    const state = {
      primary: invalidFallback,
      secondary: mainUrl,
      timestamp: Date.now(),
      cachedEndpointsState: {},
    };
    localStorage.setItem(getFallbackTrackerKey(trackerKey), JSON.stringify(state));

    const fetcher = new OracleKeeperFetcher({ chainId });
    expect(fetcher.url).toBe(mainUrl);
  });

  test("should trigger fallback after multiple failures and update store", () => {
    const fallbackUrls = oracleKeeperConfig.getOracleKeeperFallbackUrls(chainId);
    const fetcher = new OracleKeeperFetcher({ chainId });
    expect(fetcher.url).toBe(mainUrl);

    // Trigger failures to ban the main endpoint
    for (let i = 0; i < failsPerMinuteToFallback; i++) {
      fetcher.handleFailure("tickers");
      vi.advanceTimersByTime(5100);
    }

    // Should have switched to a fallback
    expect(fallbackUrls).toContain(fetcher.url);

    // Verify metrics were pushed
    expect(metrics.pushCounter).toHaveBeenCalledWith("oracleKeeper.failure", expect.anything());

    // Verify storage was updated
    const trackerKey = `OracleFallbackTracker:${chainId}`;
    const stored = localStorage.getItem(getFallbackTrackerKey(trackerKey));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.primary).toBe(fetcher.url);
  });

  test("should rotate through fallbacks on continued failures", () => {
    const fallbackUrls = oracleKeeperConfig.getOracleKeeperFallbackUrls(chainId);

    const initialFallback = fallbackUrls[0];
    const trackerKey = `OracleFallbackTracker:${chainId}`;
    const state = {
      primary: initialFallback,
      secondary: mainUrl,
      timestamp: Date.now(),
      cachedEndpointsState: {},
    };
    localStorage.setItem(getFallbackTrackerKey(trackerKey), JSON.stringify(state));

    const fetcher = new OracleKeeperFetcher({ chainId });
    expect(fetcher.url).toBe(initialFallback);

    // 1. Trigger failures to force rotation (index 0 -> 1)
    for (let i = 0; i < failsPerMinuteToFallback; i++) {
      fetcher.handleFailure("tickers");
      vi.advanceTimersByTime(5100);
    }

    expect(fallbackUrls).toContain(fetcher.url);
    let stored = localStorage.getItem(getFallbackTrackerKey(trackerKey));
    expect(JSON.parse(stored!).primary).toBe(fetcher.url);

    // 2. Trigger failures again to rotate
    for (let i = 0; i < failsPerMinuteToFallback; i++) {
      fetcher.handleFailure("tickers");
      vi.advanceTimersByTime(5100);
    }

    expect(fallbackUrls).toContain(fetcher.url);
    stored = localStorage.getItem(getFallbackTrackerKey(trackerKey));
    expect(JSON.parse(stored!).primary).toBe(fetcher.url);

    // 3. Trigger failures again to rotate
    for (let i = 0; i < failsPerMinuteToFallback; i++) {
      fetcher.handleFailure("tickers");
      vi.advanceTimersByTime(5100);
    }

    expect(fallbackUrls).toContain(fetcher.url);
    stored = localStorage.getItem(getFallbackTrackerKey(trackerKey));
    expect(JSON.parse(stored!).primary).toBe(fetcher.url);
  });

  test("should use stored fallback when re-creating fetcher after fallback triggered", () => {
    const fallbackUrls = oracleKeeperConfig.getOracleKeeperFallbackUrls(chainId);

    // Create fetcher and trigger fallback
    const fetcher1 = new OracleKeeperFetcher({ chainId });
    for (let i = 0; i < failsPerMinuteToFallback; i++) {
      fetcher1.handleFailure("tickers");
      vi.advanceTimersByTime(5100);
    }
    const newFallbackUrl = fetcher1.url;
    expect(fallbackUrls).toContain(newFallbackUrl);

    // Create new fetcher
    const fetcher2 = new OracleKeeperFetcher({ chainId });

    // Should pick up the same fallback URL
    expect(fetcher2.url).toBe(newFallbackUrl);
  });
});
