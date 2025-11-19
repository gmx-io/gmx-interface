import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getOracleKeeperFallbackStateKey } from "config/localStorage";
import { metrics } from "lib/metrics";
import { ARBITRUM } from "sdk/configs/chains";
import * as oracleKeeperConfig from "sdk/configs/oracleKeeper";

import { OracleKeeperFetcher } from "../oracleKeeperFetcher";

vi.mock("lib/metrics", () => ({
  metrics: {
    pushCounter: vi.fn(),
  },
  OracleKeeperMetricMethodId: {},
}));

describe("OracleKeeperFetcher Fallback Logic", () => {
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
    const state = {
      fallbackEndpoint: storedFallback,
      timestamp: Date.now(),
    };
    localStorage.setItem(JSON.stringify(getOracleKeeperFallbackStateKey(chainId)), JSON.stringify(state));

    const fetcher = new OracleKeeperFetcher({ chainId });
    expect(fetcher.url).toBe(storedFallback);
  });

  test("should ignore stored fallback URL if not in allowed list", () => {
    const invalidFallback = "https://evil.com";
    const state = {
      fallbackEndpoint: invalidFallback,
      timestamp: Date.now(),
    };
    localStorage.setItem(JSON.stringify(getOracleKeeperFallbackStateKey(chainId)), JSON.stringify(state));

    const fetcher = new OracleKeeperFetcher({ chainId });
    expect(fetcher.url).toBe(mainUrl);
  });

  test("should trigger fallback after multiple failures and update store", () => {
    const fallbackUrls = oracleKeeperConfig.getOracleKeeperFallbackUrls(chainId);
    const fetcher = new OracleKeeperFetcher({ chainId });
    expect(fetcher.url).toBe(mainUrl);

    // Trigger failures
    for (let i = 0; i < 5; i++) {
      fetcher.handleFailure("tickers");
      vi.advanceTimersByTime(5100);
    }

    // Should have switched to a fallback
    expect(fallbackUrls).toContain(fetcher.url);

    // Verify metrics were pushed
    expect(metrics.pushCounter).toHaveBeenCalledWith("oracleKeeper.failure", expect.anything());
    expect(metrics.pushCounter).toHaveBeenCalledWith("oracleKeeper.fallback", expect.anything());

    // Verify storage was updated
    const stored = localStorage.getItem(JSON.stringify(getOracleKeeperFallbackStateKey(chainId)));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.fallbackEndpoint).toBe(fetcher.url);
  });

  test("should rotate through fallbacks on continued failures", () => {
    const fallbackUrls = oracleKeeperConfig.getOracleKeeperFallbackUrls(chainId);

    const initialFallback = fallbackUrls[0];
    const state = {
      fallbackEndpoint: initialFallback,
      timestamp: Date.now(),
    };
    localStorage.setItem(JSON.stringify(getOracleKeeperFallbackStateKey(chainId)), JSON.stringify(state));

    const fetcher = new OracleKeeperFetcher({ chainId });
    expect(fetcher.url).toBe(initialFallback);

    // 1. Trigger failures to force rotation (index 0 -> 1)
    for (let i = 0; i < 5; i++) {
      fetcher.handleFailure("tickers");
      vi.advanceTimersByTime(5100);
    }

    expect(fetcher.url).toBe(fallbackUrls[1]);
    let stored = localStorage.getItem(JSON.stringify(getOracleKeeperFallbackStateKey(chainId)));
    expect(JSON.parse(stored!).fallbackEndpoint).toBe(fetcher.url);

    // 2. Trigger failures again to rotate (index 1 -> 2 or back to 0 if length is 2)
    for (let i = 0; i < 5; i++) {
      fetcher.handleFailure("tickers");
      vi.advanceTimersByTime(5100);
    }

    expect(fetcher.url).toBe(fallbackUrls[0]);
    stored = localStorage.getItem(JSON.stringify(getOracleKeeperFallbackStateKey(chainId)));
    expect(JSON.parse(stored!).fallbackEndpoint).toBe(fetcher.url);

    // 3. Trigger failures again to rotate (index 2 -> 0 or back to 1 if length is 2)
    for (let i = 0; i < 5; i++) {
      fetcher.handleFailure("tickers");
      vi.advanceTimersByTime(5100);
    }

    expect(fetcher.url).toBe(fallbackUrls[1]);
    stored = localStorage.getItem(JSON.stringify(getOracleKeeperFallbackStateKey(chainId)));
    expect(JSON.parse(stored!).fallbackEndpoint).toBe(fetcher.url);
  });

  test("should use stored fallback when re-creating fetcher after fallback triggered", () => {
    const fallbackUrls = oracleKeeperConfig.getOracleKeeperFallbackUrls(chainId);

    // Create fetcher and trigger fallback
    const fetcher1 = new OracleKeeperFetcher({ chainId });
    for (let i = 0; i < 5; i++) {
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
