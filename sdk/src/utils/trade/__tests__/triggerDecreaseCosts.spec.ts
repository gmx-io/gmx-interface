import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "configs/factors";
import { mockMarginCheckMarketInfo, mockTokensData } from "test/mock";
import { expandDecimals } from "utils/numbers";
import { DecreasePositionSwapType, OrderType } from "utils/orders/types";
import { PositionInfoLoaded } from "utils/positions/types";
import { convertToTokenAmount } from "utils/tokens";
import { getDecreasePositionAmounts, getNextPositionValuesForDecreaseTrade } from "utils/trade/decrease";

const tokensData = mockTokensData();
const usdc = tokensData.USDC;
const btc = tokensData.BTC;

// 0.04% position fee and no price impact: closing 50 000 pays 20 of position fees
const marketInfo = mockMarginCheckMarketInfo(tokensData, {
  positionFeeFactorForBalanceWasImproved: expandDecimals(4, 26),
  positionFeeFactorForBalanceWasNotImproved: expandDecimals(4, 26),
});

function usd(value: number) {
  return (BigInt(Math.round(value * 100)) * expandDecimals(1, USD_DECIMALS)) / 100n;
}

function toNumber(value: bigint | undefined, decimals: number) {
  return Number(value) / 10 ** decimals;
}

// a 100 000 BTC long opened at 20 000 with 6 667 USDC of collateral (15x)
function longPosition(pendingFeesUsd: number) {
  const collateralAmount = convertToTokenAmount(usd(6_667), usdc.decimals, usdc.prices.minPrice)!;

  return {
    marketInfo,
    isLong: true,
    sizeInUsd: usd(100_000),
    sizeInTokens: convertToTokenAmount(usd(100_000), btc.decimals, btc.prices.maxPrice)!,
    collateralAmount,
    collateralUsd: usd(6_667),
    pendingBorrowingFeesUsd: usd(pendingFeesUsd),
    pendingFundingFeesUsd: 0n,
    pendingImpactAmount: 0n,
    pendingImpactUsd: 0n,
  } as PositionInfoLoaded;
}

// closes half the position with a trigger order at the price that realizes `pnl` on it
function closeHalf(p: {
  type: "TP" | "SL";
  pendingFees: number;
  pnl: number;
  keepLeverage: boolean;
  forceDecreaseSwapType?: DecreasePositionSwapType;
}) {
  const position = longPosition(p.pendingFees);
  const amounts = getDecreasePositionAmounts({
    marketInfo,
    collateralToken: usdc,
    isLong: true,
    position,
    closeSizeUsd: usd(50_000),
    keepLeverage: p.keepLeverage,
    triggerPrice: (usd(100_000) + 2n * usd(p.pnl)) / 5n,
    triggerOrderType: p.type === "TP" ? OrderType.LimitDecrease : OrderType.StopLossDecrease,
    userReferralInfo: undefined,
    minCollateralUsd: usd(1),
    minPositionSizeUsd: usd(1),
    uiFeeFactor: 0n,
    isSetAcceptablePriceImpactEnabled: false,
    forceDecreaseSwapType: p.forceDecreaseSwapType,
  });
  const next = getNextPositionValuesForDecreaseTrade({
    existingPosition: position,
    marketInfo,
    collateralToken: usdc,
    sizeDeltaUsd: amounts.sizeDeltaUsd,
    sizeDeltaInTokens: amounts.sizeDeltaInTokens,
    realizedPnl: amounts.realizedPnl,
    estimatedPnl: amounts.estimatedPnl,
    collateralDeltaUsd: amounts.collateralDeltaUsd,
    collateralDeltaAmount: amounts.collateralDeltaAmount,
    payedRemainingCollateralUsd: amounts.payedRemainingCollateralUsd,
    payedRemainingCollateralAmount: amounts.payedRemainingCollateralAmount,
    proportionalPendingImpactDeltaUsd: amounts.proportionalPendingImpactDeltaUsd,
    showPnlInLeverage: false,
    isLong: true,
    minCollateralUsd: usd(1),
    userReferralInfo: undefined,
  });

  return { amounts, next };
}

describe("trigger decrease with the profit kept in the pnl token", () => {
  it("pays a partial TP's costs from the collateral before the signed withdrawal TRD-18", () => {
    // 1 319.94 of pending fees plus the 20 position fee: the contract takes all 1 339.94 out of the USDC collateral
    // and leaves the BTC profit whole, so withdrawing 3 993.46 would leave 1 333.60 at 37.49x
    const tp = { type: "TP", pendingFees: 1_319.94, pnl: 2_500, keepLeverage: true } as const;
    const { amounts, next } = closeHalf({ ...tp, forceDecreaseSwapType: DecreasePositionSwapType.NoSwap });

    expect(toNumber(amounts.collateralDeltaAmount, usdc.decimals)).toBeCloseTo(2_653.52, 2);
    expect(toNumber(amounts.payedRemainingCollateralAmount, usdc.decimals)).toBeCloseTo(1_339.94, 2);
    expect(toNumber(next.nextCollateralUsd, USD_DECIMALS)).toBeCloseTo(2_673.54, 2);
    expect(toNumber(next.nextLeverage, 4)).toBeCloseTo(18.7, 2);
    expect(amounts.primaryOutput).toMatchObject({ tokenAddress: btc.address, usd: usd(2_500) });
    expect(amounts.secondaryOutput.amount).toBe(amounts.collateralDeltaAmount);

    // the default receive swaps the profit to USDC first and the contract pays the costs from it
    expect(toNumber(closeHalf(tp).amounts.collateralDeltaAmount, usdc.decimals)).toBeCloseTo(3_993.46, 2);
  });

  // the expected values settle each close the contract's way: costs come out of the USDC collateral before the BTC
  // profit, then Keep leverage withdraws down to the leverage without pnl (18.7x, or 15x without pending fees)
  it.each([
    { type: "TP", pendingFees: 1_319.94, pnl: 1_000, keepLeverage: true, withdrawal: 2_653.52, left: 2_673.54 },
    { type: "TP", pendingFees: 1_319.94, pnl: 1_339.94, keepLeverage: true, withdrawal: 2_653.52, left: 2_673.54 },
    { type: "SL", pendingFees: 1_319.94, pnl: 2_500, keepLeverage: true, withdrawal: 2_653.52, left: 2_673.54 },
    { type: "TP", pendingFees: 0, pnl: 10, keepLeverage: true, withdrawal: 3_313.49, left: 3_333.51 },
    { type: "TP", pendingFees: 0, pnl: 20, keepLeverage: true, withdrawal: 3_313.49, left: 3_333.51 },
    { type: "TP", pendingFees: 0, pnl: 2_500, keepLeverage: true, withdrawal: 3_313.49, left: 3_333.51 },
    { type: "TP", pendingFees: 1_319.94, pnl: 2_500, keepLeverage: false, withdrawal: 0, left: 5_327.06 },
    // the costs eat the whole collateral, so there is nothing to withdraw and no remainder at the old leverage
    { type: "TP", pendingFees: 7_000, pnl: 2_500, keepLeverage: true, withdrawal: 0, left: 0 },
    // a losing stop-loss pays its loss from the collateral too, and its withdrawal never goes below zero
    { type: "SL", pendingFees: 1_319.94, pnl: -1_000, keepLeverage: true, withdrawal: 1_653.52, left: 2_673.54 },
    { type: "SL", pendingFees: 1_319.94, pnl: -3_000, keepLeverage: true, withdrawal: 0, left: 2_327.06 },
  ] as const)(
    "settles a split-receive $type the contract's way TRD-18: pending fees $pendingFees, pnl $pnl, keep leverage $keepLeverage",
    ({ withdrawal, left, ...close }) => {
      const { amounts, next } = closeHalf({ ...close, forceDecreaseSwapType: DecreasePositionSwapType.NoSwap });

      expect(toNumber(amounts.collateralDeltaAmount, usdc.decimals)).toBeCloseTo(withdrawal, 2);
      expect(toNumber(next.nextCollateralUsd, USD_DECIMALS)).toBeCloseTo(left, 2);
    }
  );
});
