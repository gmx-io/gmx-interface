import { describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";

import { isSupportedTradeLinkChainId } from "./useTradeParamsProcessor";

describe("isSupportedTradeLinkChainId", () => {
  it("accepts supported settlement-chain links", () => {
    expect(isSupportedTradeLinkChainId(String(AVALANCHE), ARBITRUM)).toBe(true);
  });

  it("rejects retired settlement-chain links", () => {
    expect(isSupportedTradeLinkChainId("3637", ARBITRUM)).toBe(false);
  });
});
