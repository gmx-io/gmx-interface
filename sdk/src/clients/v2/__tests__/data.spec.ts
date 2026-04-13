import { describe, expect, it } from "vitest";

import { getTestSdk } from "./testUtil";

const sdk = getTestSdk();

describe("GmxApiSdk — data fetching", () => {
  it("fetchMarketsInfo", async () => {
    const result = await sdk.fetchMarketsInfo();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].marketTokenAddress).toBeDefined();
  });

  it("fetchMarkets", async () => {
    const markets = await sdk.fetchMarkets();
    expect(Array.isArray(markets)).toBe(true);
    expect(markets.length).toBeGreaterThan(0);
  });

  it("fetchMarketsTickers", async () => {
    const tickers = await sdk.fetchMarketsTickers();
    expect(Array.isArray(tickers)).toBe(true);
    expect(tickers.length).toBeGreaterThan(0);
  });

  it("fetchTokensData", async () => {
    const tokensData = await sdk.fetchTokensData();
    expect(tokensData).toBeDefined();
    expect(Object.keys(tokensData).length).toBeGreaterThan(0);
  });

  it("fetchTokens", async () => {
    const tokens = await sdk.fetchTokens();
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBeGreaterThan(0);
  });

  it("fetchPairs", async () => {
    const pairs = await sdk.fetchPairs();
    expect(Array.isArray(pairs)).toBe(true);
    expect(pairs.length).toBeGreaterThan(0);
  });

  it("fetchRates", async () => {
    const rates = await sdk.fetchRates();
    expect(Array.isArray(rates)).toBe(true);
  });

  it.skip("fetchApy", async () => {
    const apy = await sdk.fetchApy();
    expect(apy).toBeDefined();
  });
});
