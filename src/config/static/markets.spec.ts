import { describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { isDelistingMarket } from "config/static/markets";

describe("isDelistingMarket", () => {
  const TON_ARB = "0x15c6eBD4175ffF9EE3c2615c556fCf62D2d9499c";
  const MELANIA_AVAX = "0xe19da27Bf9733c429445E289B662bECDCa6ce10b";

  it("returns true for a delisting market on its chain", () => {
    expect(isDelistingMarket(ARBITRUM, TON_ARB)).toBe(true);
    expect(isDelistingMarket(AVALANCHE, MELANIA_AVAX)).toBe(true);
  });

  it("returns false for a market not in the list", () => {
    expect(isDelistingMarket(ARBITRUM, "0x0000000000000000000000000000000000000001")).toBe(false);
  });

  it("is chain-scoped", () => {
    expect(isDelistingMarket(AVALANCHE, TON_ARB)).toBe(false);
  });

  it("does not match a lowercased address (casing preserved)", () => {
    expect(isDelistingMarket(ARBITRUM, TON_ARB.toLowerCase())).toBe(false);
  });
});
