import { describe, expect, it } from "vitest";

import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { applyExponentFactor, expandDecimals } from "lib/numbers";
import { getCappedPositionImpactUsd } from "sdk/utils/fees/priceImpact";

import { getDepthChartPreviewMarket } from "./previewMarket";

describe("depth chart impact preview", () => {
  it("uses the original market when preview is disabled", () => {
    const market = createMockMarketInfo();
    expect(getDepthChartPreviewMarket(market, false)).toBe(market);
  });

  it("preserves the reference impact potential without mutating quote parameters", () => {
    const market = Object.freeze(createMockMarketInfo());
    const preview = getDepthChartPreviewMarket(market, true);
    const reference = expandDecimals(1_000_000, 30);

    for (const side of ["Positive", "Negative"] as const) {
      const original =
        market[`positionImpactFactor${side}`] *
        applyExponentFactor(reference, market[`positionImpactExponentFactor${side}`]);
      const adjusted =
        preview[`positionImpactFactor${side}`] *
        applyExponentFactor(reference, preview[`positionImpactExponentFactor${side}`]);
      expect(Number(adjusted) / Number(original)).toBeCloseTo(1, 12);
    }

    expect(market.positionImpactExponentFactorNegative).toBe(expandDecimals(2, 30));
    expect(preview.indexToken).toBe(market.indexToken);
    expect(preview.maxPositionImpactFactorNegative).toBe(market.maxPositionImpactFactorNegative);
  });

  it("produces a curved, monotonic average price impact for balanced liquidity", () => {
    const market = createMockMarketInfo(undefined, {
      useOpenInterestInTokensForBalance: false,
      positionImpactFactorPositive: expandDecimals(1, 20),
      positionImpactFactorNegative: expandDecimals(15, 19),
    });
    const preview = getDepthChartPreviewMarket(market, true);
    const impacts = [250_000, 500_000, 750_000, 1_000_000].map((size) => {
      const sizeUsd = expandDecimals(size, 30);
      const { priceImpactDeltaUsd } = getCappedPositionImpactUsd(preview, sizeUsd, true, true, {
        shouldCapNegativeImpact: true,
      });
      return -Number(priceImpactDeltaUsd) / Number(sizeUsd);
    });

    expect(impacts.every((impact, i) => i === 0 || impact > impacts[i - 1])).toBe(true);
    expect(impacts[1] / impacts[3]).toBeGreaterThan(0.6);
    const reference = expandDecimals(1_000_000, 30);
    const originalImpact = getCappedPositionImpactUsd(market, reference, true, true).priceImpactDeltaUsd;
    expect(impacts[3]).toBeCloseTo(-Number(originalImpact) / Number(reference), 12);
  });
});
