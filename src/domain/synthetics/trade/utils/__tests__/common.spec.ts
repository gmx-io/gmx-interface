import { describe, expect, it } from "vitest";

import { getTradeFees } from "../common";
import { makeSwapStep } from "./fixtures";

describe("getTradeFees", () => {
  it("calculates swap profit fee percentage based on swap amount", () => {
    const fees = getTradeFees({
      initialCollateralUsd: 1000n,
      sizeInUsd: 0n,
      sizeDeltaUsd: 0n,
      collateralDeltaUsd: 0n,
      swapSteps: [],
      externalSwapQuote: undefined,
      positionFeeUsd: 0n,
      swapPriceImpactDeltaUsd: 0n,
      increasePositionPriceImpactDeltaUsd: 0n,
      totalPendingImpactDeltaUsd: 0n,
      proportionalPendingImpactDeltaUsd: 0n,
      decreasePositionPriceImpactDeltaUsd: 0n,
      priceImpactDiffUsd: 0n,
      borrowingFeeUsd: 0n,
      fundingFeeUsd: 0n,
      feeDiscountUsd: 0n,
      swapProfitFeeUsd: 30n,
      swapProfitUsdIn: 100n,
      uiFeeFactor: 0n,
      type: "decrease",
    });

    expect(fees.swapProfitFee?.bps).toBe(-3000n);
  });

  it("calculates swap price impact percentage based on swap amount", () => {
    const fees = getTradeFees({
      initialCollateralUsd: 1000n,
      sizeInUsd: 0n,
      sizeDeltaUsd: 0n,
      collateralDeltaUsd: 0n,
      swapSteps: [makeSwapStep(200n)],
      externalSwapQuote: undefined,
      positionFeeUsd: 0n,
      swapPriceImpactDeltaUsd: -10n,
      increasePositionPriceImpactDeltaUsd: 0n,
      totalPendingImpactDeltaUsd: 0n,
      proportionalPendingImpactDeltaUsd: 0n,
      decreasePositionPriceImpactDeltaUsd: 0n,
      priceImpactDiffUsd: 0n,
      borrowingFeeUsd: 0n,
      fundingFeeUsd: 0n,
      feeDiscountUsd: 0n,
      swapProfitFeeUsd: 0n,
      swapProfitUsdIn: 0n,
      uiFeeFactor: 0n,
      type: "swap",
    });

    expect(fees.swapPriceImpact?.bps).toBe(-500n);
  });
  it("keeps Solana withheld collateral separate from capped impact and fees FESOL-52", () => {
    const usd = (value: number) => BigInt(value) * 10n ** 30n;
    const cases = [
      { tradeMath: undefined, type: "decrease", impact: -30, diff: 20, total: -16, pay: -16, net: -10 },
      { tradeMath: "gmsol", type: "decrease", impact: -10, diff: 20, total: -16, pay: -36, net: -10 },
      { tradeMath: "gmsol", type: "decrease", impact: -10, diff: 0, total: -16, pay: -16, net: -10 },
      { tradeMath: "gmsol", type: "decrease", impact: 10, diff: 0, total: 4, pay: 4, net: 10 },
      { tradeMath: "gmsol", type: "increase", impact: -10, diff: 0, total: -6, pay: -6, net: -10 },
    ] as const;
    for (const row of cases) {
      const fees = getTradeFees({
        tradeMath: row.tradeMath,
        type: row.type,
        initialCollateralUsd: usd(100),
        sizeInUsd: usd(1000),
        sizeDeltaUsd: usd(1000),
        collateralDeltaUsd: usd(100),
        swapSteps: [],
        externalSwapQuote: undefined,
        positionFeeUsd: usd(1),
        feeDiscountUsd: usd(1),
        borrowingFeeUsd: usd(2),
        fundingFeeUsd: usd(3),
        swapPriceImpactDeltaUsd: 0n,
        increasePositionPriceImpactDeltaUsd: row.type === "increase" ? usd(row.impact) : 0n,
        decreasePositionPriceImpactDeltaUsd: row.type === "decrease" ? usd(row.impact - row.diff) : 0n,
        totalPendingImpactDeltaUsd: row.type === "decrease" ? usd(row.impact) : 0n,
        proportionalPendingImpactDeltaUsd: 0n,
        priceImpactDiffUsd: usd(row.diff),
        swapProfitFeeUsd: 0n,
        swapProfitUsdIn: 0n,
        uiFeeFactor: 0n,
      });
      expect(fees.totalFees?.deltaUsd).toBe(usd(row.total));
      expect(fees.payTotalFees?.deltaUsd).toBe(usd(row.pay));
      expect(fees.positionNetPriceImpact?.deltaUsd).toBe(usd(row.net));
      expect(fees.collateralNetPriceImpact?.deltaUsd).toBe(usd(row.net));
      expect(fees.positionFee?.deltaUsd).toBe(-usd(2));
    }
  });
});
