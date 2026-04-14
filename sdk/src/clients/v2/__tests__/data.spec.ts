import { describe, expect, it } from "vitest";

import { getTestSdk, getTestSigner } from "./testUtil";

const sdk = getTestSdk();
const signer = getTestSigner();

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

  it("fetchMarketsTickers filters by address", async () => {
    const all = await sdk.fetchMarketsTickers();
    const first = all[0];
    const filtered = await sdk.fetchMarketsTickers({ addresses: [first.marketTokenAddress] });
    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered[0].marketTokenAddress).toBe(first.marketTokenAddress);
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

describe("positions & orders", () => {
  const account = signer?.address;

  it.skipIf(!signer)("fetchPositionsInfo returns positions for account", async () => {
    const positions = await sdk.fetchPositionsInfo({ address: account! });
    expect(Array.isArray(positions)).toBe(true);
    if (positions.length > 0) {
      expect(positions[0].account).toBe(account);
      expect(positions[0].marketAddress).toBeDefined();
      expect(positions[0].sizeInUsd).toBeDefined();
    }
  });

  it.skipIf(!signer)("fetchPositionsInfo with includeRelatedOrders", async () => {
    const [without, withOrders] = await Promise.all([
      sdk.fetchPositionsInfo({ address: account! }),
      sdk.fetchPositionsInfo({ address: account!, includeRelatedOrders: true }),
    ]);
    expect(Array.isArray(withOrders)).toBe(true);
    expect(withOrders.length).toBeGreaterThanOrEqual(without.length);
  });

  it.skipIf(!signer)("fetchOrders returns orders array", async () => {
    const orders = await sdk.fetchOrders({ address: account! });
    expect(Array.isArray(orders)).toBe(true);
  });

  it("fetchPositionsInfo with invalid address returns empty", async () => {
    const result = await sdk.fetchPositionsInfo({
      address: "0x0000000000000000000000000000000000000001",
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});
