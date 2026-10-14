import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { getIsUsdgPool } from "../usdgPools";

const USDG = getTokenBySymbol(ARBITRUM, "USDG").address;
const USDC = getTokenBySymbol(ARBITRUM, "USDC").address;
const WETH = getTokenBySymbol(ARBITRUM, "WETH").address;

describe("getIsUsdgPool", () => {
  it("is true for a USDG-USDG pool", () => {
    expect(getIsUsdgPool(ARBITRUM, { longTokenAddress: USDG, shortTokenAddress: USDG })).toBe(true);
  });

  it("is true for the USDC-USDG swap pool", () => {
    expect(getIsUsdgPool(ARBITRUM, { longTokenAddress: USDC, shortTokenAddress: USDG })).toBe(true);
  });

  it("is false for a pool without USDG", () => {
    expect(getIsUsdgPool(ARBITRUM, { longTokenAddress: WETH, shortTokenAddress: USDC })).toBe(false);
  });
});
