import { describe, expect, it } from "vitest";

import { usdToNumber } from "../../costs";
import { normalizeHyperliquidMarkets } from "../api";
import type { HyperliquidMetaAndAssetCtxsResponse } from "../types";

describe("Hyperliquid API normalization", () => {
  it("combines meta and asset contexts and excludes delisted markets", () => {
    const response: HyperliquidMetaAndAssetCtxsResponse = [
      {
        universe: [
          { name: "ETH", szDecimals: 4, maxLeverage: 25, marginTableId: 1 },
          { name: "MATIC", szDecimals: 1, maxLeverage: 20, marginTableId: 2, isDelisted: true },
        ],
      },
      [
        { dayNtlVlm: "12345.67", markPx: "2100", midPx: "2100.5", funding: "0.0000125" },
        { dayNtlVlm: "999", markPx: "1", funding: "0" },
      ],
    ];

    const markets = normalizeHyperliquidMarkets(response, 123);

    expect(markets).toHaveLength(1);
    expect(markets[0]).toMatchObject({
      symbol: "ETH",
      displayName: "ETH",
      isDisabled: false,
      markPrice: 2100,
      midPrice: 2100.5,
      hourlyFundingRate: 0.0000125,
      timestamp: 123,
    });
    expect(usdToNumber(markets[0].volume24hUsd)).toBeCloseTo(12345.67, 6);
  });
});
