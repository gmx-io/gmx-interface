import { describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";

import { getCleanedTradeSearch, isSupportedTradeLinkChainId } from "./useTradeParamsProcessor";

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
