import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getFallbackTrackerKey } from "config/localStorage";
import { getChainName } from "config/rpc";
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
    const trackerKey = `OracleFallbackTracker:${getChainName(chainId)}`;
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
    const trackerKey = `OracleFallbackTracker:${getChainName(chainId)}`;
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

  test("should trigger fallback after multiple failures and update store", async () => {
    const fetcher = new OracleKeeperFetcher({ chainId });
    expect(fetcher.url).toBe(mainUrl);

    // Trigger failures to ban the main endpoint
    for (let i = 0; i < failsPerMinuteToFallback; i++) {
      fetcher.handleFailure("tickers");
      await vi.advanceTimersByTimeAsync(5100);
    }

    // Wait for selectBestEndpoints to complete (it's called after banEndpoint)
    await vi.advanceTimersByTimeAsync(100);

    // Should have switched to a fallback (or at least the main endpoint should be banned)
    const tracker = fetcher.oracleTracker.fallbackTracker;
    const mainEndpointState = tracker.state.endpointsState[mainUrl];
    expect(mainEndpointState.banned).toBeDefined();

    // Verify metrics were pushed
    expect(metrics.pushCounter).toHaveBeenCalledWith("oracleKeeper.failure", expect.anything());

    // Verify storage was updated
    const trackerKey = `OracleFallbackTracker:${getChainName(chainId)}`;
    const stored = localStorage.getItem(getFallbackTrackerKey(trackerKey));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    // Main endpoint should be banned in cachedEndpointsState
    expect(parsed.cachedEndpointsState[mainUrl]?.banned).toBeDefined();
  });
});
