import { describe, expect, it } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";
import { GLV_MARKETS } from "config/markets";
import { getMappedTokenId } from "config/multichain";
import { MARKETS } from "sdk/configs/markets";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { formatApprovalAmount, getApprovalTokenDisplay } from "./insufficientApproval";

describe("getApprovalTokenDisplay", () => {
  it("resolves a configured token by its own symbol and decimals", () => {
    const weth = getTokenBySymbol(ARBITRUM, "WETH");

    expect(getApprovalTokenDisplay(ARBITRUM, weth.address)).toEqual({ symbol: "WETH", decimals: 18 });
  });

  it("resolves a GM market token", () => {
    const marketTokenAddress = Object.keys(MARKETS[ARBITRUM])[0];

    expect(getApprovalTokenDisplay(ARBITRUM, marketTokenAddress)).toEqual({ symbol: "GM", decimals: 18 });
  });

  it("resolves a GLV token", () => {
    const glvAddress = Object.keys(GLV_MARKETS[ARBITRUM])[0];

    expect(getApprovalTokenDisplay(ARBITRUM, glvAddress)).toEqual({ symbol: "GLV", decimals: 18 });
  });

  it("resolves a regular token on a source chain with that chain's decimals", () => {
    const usdcOnArbitrum = getTokenBySymbol(ARBITRUM, "USDC");
    const usdcOnBase = getMappedTokenId(ARBITRUM, usdcOnArbitrum.address, SOURCE_BASE_MAINNET)!;

    expect(getApprovalTokenDisplay(SOURCE_BASE_MAINNET, usdcOnBase.address)).toEqual({
      symbol: "USDC",
      decimals: usdcOnBase.decimals,
    });
  });

  it("names a GLV token on a source chain without its internal key", () => {
    const glvOnArbitrum = Object.keys(GLV_MARKETS[ARBITRUM])[0];
    const glvOnBase = getMappedTokenId(ARBITRUM, glvOnArbitrum, SOURCE_BASE_MAINNET)!;

    expect(getApprovalTokenDisplay(SOURCE_BASE_MAINNET, glvOnBase.address)).toEqual({ symbol: "GLV", decimals: 18 });
  });

  it("returns undefined for an unknown address", () => {
    expect(getApprovalTokenDisplay(ARBITRUM, "0x0000000000000000000000000000000000000001")).toBeUndefined();
  });
});

describe("formatApprovalAmount", () => {
  it("keeps the full token precision so the shortfall is visible", () => {
    expect(formatApprovalAmount(1234100000000000n, { symbol: "WETH", decimals: 18 })).toBe("0.0012341 WETH");
    expect(formatApprovalAmount(1230000000000000n, { symbol: "WETH", decimals: 18 })).toBe("0.00123 WETH");
  });
});
