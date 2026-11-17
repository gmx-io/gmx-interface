import { describe, expect, it } from "vitest";

import { numberToUsd, usdToNumber } from "../../costs";
import { getHyperliquidExecutionImpactUsd, getHyperliquidFundingCostUsd, simulateL2BookFill } from "../book";
import type { HyperliquidBookLevel } from "../types";

const asks: HyperliquidBookLevel[] = [
  { px: "100", sz: "1", n: 1 },
  { px: "110", sz: "2", n: 1 },
];

const bids: HyperliquidBookLevel[] = [
  { px: "99", sz: "1", n: 1 },
  { px: "98", sz: "2", n: 1 },
];

describe("Hyperliquid L2 book math", () => {
  it("fills the base quantity implied by reference-price USD notional across multiple levels", () => {
    const fill = simulateL2BookFill({ levels: asks, sizeUsd: numberToUsd(210), referencePrice: 100 });
    const bidFill = simulateL2BookFill({ levels: bids, sizeUsd: numberToUsd(197), referencePrice: 100 });

    expect(fill.status).toBe("filled");
    expect(fill.averagePrice).toBeCloseTo(105.238095, 6);
    expect(usdToNumber(fill.filledUsd)).toBeCloseTo(221, 6);
    expect(bidFill.status).toBe("filled");
    expect(bidFill.averagePrice).toBeCloseTo(98.507614, 6);
    expect(usdToNumber(bidFill.filledUsd)).toBeCloseTo(194.06, 6);
  });

  it("marks insufficient depth when returned levels cannot fill requested notional", () => {
    const fill = simulateL2BookFill({ levels: asks.slice(0, 1), sizeUsd: numberToUsd(250), referencePrice: 100 });

    expect(fill.status).toBe("insufficientDepth");
    expect(usdToNumber(fill.filledUsd)).toBeCloseTo(100, 6);
  });

  it("calculates ask-side and bid-side execution impact as trader cost", () => {
    expect(
      usdToNumber(
        getHyperliquidExecutionImpactUsd({
          sizeUsd: numberToUsd(1000),
          referencePrice: 100,
          averagePrice: 101,
          side: "ask",
        })
      )
    ).toBeCloseTo(10, 6);
    expect(
      usdToNumber(
        getHyperliquidExecutionImpactUsd({
          sizeUsd: numberToUsd(1000),
          referencePrice: 100,
          averagePrice: 99,
          side: "bid",
        })
      )
    ).toBeCloseTo(10, 6);
    expect(
      usdToNumber(
        getHyperliquidExecutionImpactUsd({
          sizeUsd: numberToUsd(1000),
          referencePrice: 100,
          averagePrice: 99.5,
          side: "ask",
        })
      )
    ).toBeCloseTo(-5, 6);
  });

  it("projects funding cost with positive rates paid by longs and received by shorts", () => {
    expect(
      usdToNumber(
        getHyperliquidFundingCostUsd({
          sizeUsd: numberToUsd(10_000),
          side: "long",
          hourlyFundingRate: 0.0001,
          holdingPeriodHours: 8,
        })
      )
    ).toBeCloseTo(8, 6);
    expect(
      usdToNumber(
        getHyperliquidFundingCostUsd({
          sizeUsd: numberToUsd(10_000),
          side: "short",
          hourlyFundingRate: 0.0001,
          holdingPeriodHours: 8,
        })
      )
    ).toBeCloseTo(-8, 6);
  });
});
