import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getFallbackTrackerKey } from "config/localStorage";
import { getChainName } from "config/rpc";
import { suppressConsole } from "lib/__testUtils__/_utils";
import { NetworkStatusObserver } from "lib/FallbackTracker/NetworkStatusObserver";
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

describe("OracleKeeperFetcher tickers completeness", () => {
  suppressConsole();

  const chainId = ARBITRUM;
  const mainUrl = oracleKeeperConfig.getOracleKeeperUrl(chainId);
  const [fallbackUrl, secondFallbackUrl] = oracleKeeperConfig.getOracleKeeperFallbackUrls(chainId);

  const ticker = (tokenAddress: string) => ({
    tokenAddress,
    tokenSymbol: tokenAddress,
    minPrice: "1",
    maxPrice: "1",
    oracleDecimals: 30,
    updatedAt: 0,
  });

  const ETH = "0xeth";
  const BTC = "0xbtc";

  let fetchMock: ReturnType<typeof vi.fn>;

  const serve = (responses: { [endpoint: string]: string[] | Error }) => {
    fetchMock.mockImplementation((url: string) => {
      const endpoint = Object.keys(responses).find((candidate) => url.startsWith(candidate));
      const response = endpoint ? responses[endpoint] : undefined;

      if (!response || response instanceof Error) {
        return Promise.reject(response ?? new Error(`Unexpected request ${url}`));
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve(response.map(ticker)) });
    });
  };

  const failureCount = (fetcher: OracleKeeperFetcher, endpoint: string) =>
    fetcher.oracleTracker.fallbackTracker.state.endpointsState[endpoint].failureTimestamps.length;

  const pushCounterMock = metrics.pushCounter as unknown as ReturnType<typeof vi.fn>;

  const partialReports = () => pushCounterMock.mock.calls.filter(([event]) => event === "tickersPartialData").length;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.clearAllMocks();
    NetworkStatusObserver._instance = undefined;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("uses the fallback response and reports the primary when it omits a token the fallback serves", async () => {
    const fetcher = new OracleKeeperFetcher({ chainId });

    serve({ [mainUrl]: [ETH, BTC], [fallbackUrl]: [ETH, BTC], [secondFallbackUrl]: [ETH, BTC] });
    await fetcher.fetchTickers();

    serve({ [mainUrl]: [ETH], [fallbackUrl]: [ETH, BTC], [secondFallbackUrl]: [ETH, BTC] });
    fetchMock.mockClear();
    const tickers = await fetcher.fetchTickers();

    expect(tickers.map((t) => t.tokenAddress)).toEqual([ETH, BTC]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(partialReports()).toBe(1);
    expect(metrics.pushCounter).toHaveBeenCalledWith("oracleKeeper.failure", { chainId, method: "tickers" });
    expect(failureCount(fetcher, mainUrl)).toBe(1);
    expect(failureCount(fetcher, fallbackUrl)).toBe(0);
  });

  test("accepts a shrunken response without reporting when every endpoint omits the token", async () => {
    const fetcher = new OracleKeeperFetcher({ chainId });

    serve({ [mainUrl]: [ETH, BTC], [fallbackUrl]: [ETH, BTC], [secondFallbackUrl]: [ETH, BTC] });
    await fetcher.fetchTickers();

    serve({ [mainUrl]: [ETH], [fallbackUrl]: [ETH], [secondFallbackUrl]: [ETH] });
    fetchMock.mockClear();
    const tickers = await fetcher.fetchTickers();

    expect(tickers.map((t) => t.tokenAddress)).toEqual([ETH]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(partialReports()).toBe(0);
    expect(metrics.pushCounter).not.toHaveBeenCalled();
    expect(failureCount(fetcher, mainUrl)).toBe(0);
    expect(failureCount(fetcher, fallbackUrl)).toBe(0);
    expect(failureCount(fetcher, secondFallbackUrl)).toBe(0);

    fetchMock.mockClear();
    await fetcher.fetchTickers();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("expects a token again once it is served again", async () => {
    const fetcher = new OracleKeeperFetcher({ chainId });

    serve({ [mainUrl]: [ETH, BTC], [fallbackUrl]: [ETH, BTC], [secondFallbackUrl]: [ETH, BTC] });
    await fetcher.fetchTickers();

    serve({ [mainUrl]: [ETH], [fallbackUrl]: [ETH], [secondFallbackUrl]: [ETH] });
    await fetcher.fetchTickers();

    serve({ [mainUrl]: [ETH, BTC], [fallbackUrl]: [ETH, BTC], [secondFallbackUrl]: [ETH, BTC] });
    await fetcher.fetchTickers();

    serve({ [mainUrl]: [ETH], [fallbackUrl]: [ETH, BTC], [secondFallbackUrl]: [ETH, BTC] });
    const tickers = await fetcher.fetchTickers();

    expect(tickers.map((t) => t.tokenAddress)).toEqual([ETH, BTC]);
    expect(partialReports()).toBe(1);
    expect(failureCount(fetcher, mainUrl)).toBe(1);
  });

  test("keeps expecting the token when a request is rejected", async () => {
    const fetcher = new OracleKeeperFetcher({ chainId });

    serve({ [mainUrl]: [ETH, BTC], [fallbackUrl]: [ETH, BTC], [secondFallbackUrl]: [ETH, BTC] });
    await fetcher.fetchTickers();

    const outage = new Error("offline");
    serve({ [mainUrl]: outage, [fallbackUrl]: outage, [secondFallbackUrl]: outage });
    await expect(fetcher.fetchTickers()).rejects.toThrow("offline");

    vi.clearAllMocks();
    serve({ [mainUrl]: [ETH], [fallbackUrl]: [ETH, BTC], [secondFallbackUrl]: [ETH, BTC] });
    const tickers = await fetcher.fetchTickers();

    expect(tickers.map((t) => t.tokenAddress)).toEqual([ETH, BTC]);
    expect(partialReports()).toBe(1);
  });

  test("returns the last incomplete response instead of rejecting when the remaining endpoints fail", async () => {
    const fetcher = new OracleKeeperFetcher({ chainId });

    serve({ [mainUrl]: [ETH, BTC], [fallbackUrl]: [ETH, BTC], [secondFallbackUrl]: [ETH, BTC] });
    await fetcher.fetchTickers();

    serve({ [mainUrl]: [ETH], [fallbackUrl]: [ETH], [secondFallbackUrl]: new Error("down") });
    const tickers = await fetcher.fetchTickers();

    expect(tickers.map((t) => t.tokenAddress)).toEqual([ETH]);
    expect(partialReports()).toBe(0);

    fetchMock.mockClear();
    serve({ [mainUrl]: [ETH], [fallbackUrl]: [ETH], [secondFallbackUrl]: new Error("down") });
    await fetcher.fetchTickers();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
