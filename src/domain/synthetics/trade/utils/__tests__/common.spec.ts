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
});
