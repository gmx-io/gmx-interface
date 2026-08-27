import { describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { TradeType } from "sdk/utils/trade/types";

import { getCleanedTradeSearch, getTradeLinkTradeType, isSupportedTradeLinkChainId } from "./useTradeParamsProcessor";

describe("isSupportedTradeLinkChainId", () => {
  it("accepts supported settlement-chain links", () => {
    expect(isSupportedTradeLinkChainId(String(AVALANCHE), ARBITRUM)).toBe(true);
  });

  it("rejects retired settlement-chain links", () => {
    expect(isSupportedTradeLinkChainId("3637", ARBITRUM)).toBe(false);
  });
});

describe("getCleanedTradeSearch", () => {
  it("strips consumed trade link params and keeps the rest", () => {
    expect(getCleanedTradeSearch("?from=USDC&to=ETH&mode=market&utm_source=x")).toBe("utm_source=x");
  });

  it("strips a search consisting only of trade link params to an empty string", () => {
    expect(getCleanedTradeSearch("?to=ETH&pool=WETH-USDC")).toBe("");
  });

  it("returns undefined when only unrelated params are present, so no replace is triggered", () => {
    expect(getCleanedTradeSearch("?utm_source=Trust_iOS_Browser&testExampleAb=0")).toBe(undefined);
    expect(getCleanedTradeSearch("?privy_connector=injected")).toBe(undefined);
  });

  it("returns undefined for an empty search", () => {
    expect(getCleanedTradeSearch("")).toBe(undefined);
  });

  it("ignores encoding-only differences instead of rewriting the url forever", () => {
    expect(getCleanedTradeSearch("?utm_content=a%20b")).toBe(undefined);
  });
});

describe("getTradeLinkTradeType", () => {
  it("takes the trade type from the path", () => {
    expect(getTradeLinkTradeType("short", TradeType.Long)).toBe(TradeType.Short);
  });

  it("matches the path trade type case-insensitively", () => {
    expect(getTradeLinkTradeType("SWAP", TradeType.Long)).toBe(TradeType.Swap);
  });

  it("falls back to the current trade type when the link carries none", () => {
    expect(getTradeLinkTradeType(undefined, TradeType.Short)).toBe(TradeType.Short);
  });

  it("falls back to the current trade type when the link carries an unknown one", () => {
    expect(getTradeLinkTradeType("perp", TradeType.Swap)).toBe(TradeType.Swap);
  });

  it("stays undefined while the tradebox has no trade type yet", () => {
    expect(getTradeLinkTradeType(undefined, undefined)).toBeUndefined();
  });
});
