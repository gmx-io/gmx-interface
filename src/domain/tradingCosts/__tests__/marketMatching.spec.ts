import { describe, expect, it } from "vitest";

import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";

import { matchGmxMarketsToVenueMarkets, normalizeMarketSymbol } from "../marketMatching";
import type { ComparisonVenueMarket } from "../types";

const hyperliquidEth: ComparisonVenueMarket = {
  providerId: "hyperliquid",
  symbol: "ETH",
  displayName: "ETH",
  volume24hUsd: 100n,
};

describe("market matching", () => {
  it("normalizes wrapped symbols to venue symbols", () => {
    expect(normalizeMarketSymbol("WETH")).toBe("ETH");
    expect(normalizeMarketSymbol("WBTC")).toBe("BTC");
    expect(normalizeMarketSymbol("kPEPE")).toBe("KPEPE");
  });

  it("matches every enabled non-spot GMX market with a venue symbol", () => {
    const ethMarket = createMockMarketInfo();
    const secondEthMarket = { ...ethMarket, marketTokenAddress: "0x222", name: "ETH/USD [ETH-USDT]" };

    const result = matchGmxMarketsToVenueMarkets([ethMarket, secondEthMarket], [hyperliquidEth]);

    expect(result.matched.map((item) => item.gmxMarket.marketTokenAddress)).toEqual([
      ethMarket.marketTokenAddress,
      "0x222",
    ]);
    expect(result.unmatched).toEqual([]);
  });

  it("excludes disabled, spot-only, and disabled venue markets from matched rows", () => {
    const enabledMarket = createMockMarketInfo();
    const disabledMarket = { ...createMockMarketInfo(), marketTokenAddress: "0xdisabled", isDisabled: true };
    const spotMarket = { ...createMockMarketInfo(), marketTokenAddress: "0xspot", isSpotOnly: true };

    const disabledVenue: ComparisonVenueMarket = { ...hyperliquidEth, isDisabled: true };

    expect(matchGmxMarketsToVenueMarkets([enabledMarket, disabledMarket, spotMarket], [disabledVenue]).matched).toEqual(
      []
    );
    expect(
      matchGmxMarketsToVenueMarkets([enabledMarket, disabledMarket, spotMarket], [hyperliquidEth]).matched
    ).toHaveLength(1);
  });
});
