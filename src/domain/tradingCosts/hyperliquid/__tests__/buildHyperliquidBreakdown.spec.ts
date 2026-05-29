import { describe, expect, it } from "vitest";

import { numberToUsd, usdToNumber } from "../../costs";
import type { TradingCostScenario } from "../../types";
import { buildHyperliquidBreakdown } from "../buildHyperliquidBreakdown";
import type { HyperliquidBookBundle, HyperliquidL2BookResponse, HyperliquidNormalizedMarket } from "../types";

const market: HyperliquidNormalizedMarket = {
  symbol: "BTC",
  displayName: "BTC",
  isDisabled: false,
  volume24hUsd: numberToUsd(1_000_000_000),
  markPrice: 100,
  midPrice: 100,
  hourlyFundingRate: 0,
  timestamp: 1,
};

const scenario: TradingCostScenario = {
  sizeUsd: numberToUsd(1_000),
  side: "long",
  holdingPeriodHours: 8,
  comparisonVenue: "hyperliquid",
  venueAssumptions: {
    hyperliquid: { takerFeeRate: 0.00045 },
  },
};

function book({
  bidSize,
  askSize,
  time,
}: {
  bidSize: string;
  askSize: string;
  time: number;
}): HyperliquidL2BookResponse {
  return {
    coin: "BTC",
    time,
    levels: [[{ px: "99", sz: bidSize, n: 1 }], [{ px: "101", sz: askSize, n: 1 }]],
  };
}

describe("buildHyperliquidBreakdown", () => {
  it("uses aggregated book fallback when default levels cannot fill the requested round trip", () => {
    const books: HyperliquidBookBundle = {
      default: book({ bidSize: "1", askSize: "1", time: 10 }),
      aggregated: book({ bidSize: "20", askSize: "20", time: 20 }),
    };

    const breakdown = buildHyperliquidBreakdown({
      scenario,
      match: undefined as never,
      market,
      book: books,
    });

    expect(breakdown.status).toBe("ready");
    expect(breakdown.timestamp).toBe(20);
    expect(breakdown.warnings).toEqual([
      "Using aggregated Hyperliquid book depth because the default 20-level book cannot fill the requested round-trip size.",
    ]);
    expect(usdToNumber(breakdown.totalUsd)).toBeCloseTo(20.9, 6);
  });
});
