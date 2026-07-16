import { describe, expect, it } from "vitest";

import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { expandDecimals } from "lib/numbers";

import { buildTradingCostRows, getMatchedVenueSymbols } from "../buildTradingCostRows";
import { numberToUsd, usdToNumber } from "../costs";
import type { TradingCostBreakdown, TradingCostScenario } from "../types";

const scenario: TradingCostScenario = {
  sizeUsd: expandDecimals(10_000, 30),
  side: "long",
  holdingPeriodHours: 8,
  comparisonVenue: "hyperliquid",
  venueAssumptions: { hyperliquid: { takerFeeRate: 0.00045 } },
};

function breakdown(providerId: "gmx" | "hyperliquid", totalUsd: bigint | undefined): TradingCostBreakdown {
  return {
    providerId,
    totalUsd,
    components: [],
    timestamp: 1,
    status: totalUsd === undefined ? "providerError" : "ready",
    warnings: [],
  };
}

describe("buildTradingCostRows", () => {
  it("builds matched rows, calculates delta, and sorts by venue volume", () => {
    const eth = createMockMarketInfo();
    const btc = {
      ...createMockMarketInfo(),
      marketTokenAddress: "0xbtc",
      name: "BTC/USD [BTC-USDC]",
      indexToken: { ...createMockMarketInfo().indexToken, symbol: "BTC" },
    };

    const rows = buildTradingCostRows({
      scenario,
      gmxMarkets: [eth, btc],
      venueMarkets: [
        { providerId: "hyperliquid", symbol: "ETH", displayName: "ETH", volume24hUsd: numberToUsd(100) },
        { providerId: "hyperliquid", symbol: "BTC", displayName: "BTC", volume24hUsd: numberToUsd(200) },
      ],
      buildGmxBreakdown: (market) =>
        breakdown("gmx", market.marketTokenAddress === "0xbtc" ? numberToUsd(12) : numberToUsd(20)),
      buildVenueBreakdown: (match) =>
        breakdown("hyperliquid", match.venueMarket.symbol === "BTC" ? numberToUsd(10) : numberToUsd(15)),
    });

    expect(rows.map((row) => row.indexSymbol)).toEqual(["BTC", "ETH"]);
    expect(usdToNumber(rows[0].deltaUsd)).toBeCloseTo(2, 6);
    expect(usdToNumber(rows[1].deltaUsd)).toBeCloseTo(5, 6);
  });

  it("returns only matched venue symbols for book requests", () => {
    const eth = createMockMarketInfo();
    const btc = {
      ...createMockMarketInfo(),
      marketTokenAddress: "0xbtc",
      name: "BTC/USD [BTC-USDC]",
      indexToken: { ...createMockMarketInfo().indexToken, symbol: "BTC" },
    };
    const secondEth = {
      ...createMockMarketInfo(),
      marketTokenAddress: "0xeth2",
      name: "ETH/USD [ETH-USDT]",
    };

    const symbols = getMatchedVenueSymbols({
      gmxMarkets: [eth, btc, secondEth],
      venueMarkets: [
        { providerId: "hyperliquid", symbol: "ETH", displayName: "ETH", volume24hUsd: numberToUsd(100) },
        { providerId: "hyperliquid", symbol: "BTC", displayName: "BTC", volume24hUsd: numberToUsd(200) },
        { providerId: "hyperliquid", symbol: "DOGE", displayName: "DOGE", volume24hUsd: numberToUsd(300) },
      ],
    });

    expect(symbols).toEqual(["ETH", "BTC"]);
  });
});
