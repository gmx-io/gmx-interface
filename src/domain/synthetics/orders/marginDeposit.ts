import { maxUint256 } from "viem";

import type { UserReferralInfo } from "sdk/utils/referrals/types";

import { OrderType } from "./types";
import { PositionInfo, getLeverage, getLiquidationPrice, getPositionPnlUsd } from "../positions";
import { TokenData, convertToTokenAmount, convertToUsd, getIsEquivalentTokens } from "../tokens";

/**
 * Minimal shape shared by OrderInfo and PositionTradeAction so both can be checked with one helper.
 * `isTwap` is optional: OrderInfo carries it, trade actions do not — those callers must pass it explicitly.
 */
export type MarginDepositOrderLike = {
  orderType: OrderType;
  sizeDeltaUsd: bigint;
  initialCollateralDeltaAmount: bigint;
  isTwap?: boolean;
};

/**
 * A margin deposit adds collateral to an existing position at a trigger price without changing its size.
 */
export function isMarginDepositOrder(order: MarginDepositOrderLike): boolean {
  if (order.isTwap === true) {
    return false;
  }

  return (
    order.orderType === OrderType.LimitIncrease && order.sizeDeltaUsd === 0n && order.initialCollateralDeltaAmount > 0n
  );
}

/**
 * When the collateral is the market's index token (or its wrapped/native/synthetic equivalent) its value at
 * execution follows the trigger price, so the deposit must be valued there instead of at the current price.
 */
export function getMarginDepositValuationPrice(p: {
  collateralToken: TokenData;
  indexToken: TokenData;
  triggerPrice: bigint | undefined;
}): bigint {
  const { collateralToken, indexToken, triggerPrice } = p;

  if (triggerPrice !== undefined && triggerPrice > 0n && getIsEquivalentTokens(collateralToken, indexToken)) {
    return triggerPrice;
  }

  return collateralToken.prices.minPrice;
}

export type MarginDepositProjections = {
  depositUsdAtTrigger: bigint;
  nextCollateralUsd: bigint;
  nextCollateralAmount: bigint;
  nextLeverage: bigint | undefined;
  nextLiqPrice: bigint | undefined;
};

/**
 * Projects a position after a margin deposit of `depositAmount` executed at `triggerPrice`.
 * Mirrors usePositionEditorData: pending fees are folded into the collateral, then 0n pending fees are
 * passed down to getLeverage/getLiquidationPrice.
 */
export function getMarginDepositProjections(p: {
  position: PositionInfo;
  depositAmount: bigint;
  triggerPrice: bigint | undefined;
  minCollateralUsd: bigint | undefined;
  userReferralInfo: UserReferralInfo | undefined;
  pendingFeesUsd: bigint;
  isPnlInLeverage?: boolean;
}): MarginDepositProjections | undefined {
  const { position, depositAmount, triggerPrice, minCollateralUsd, userReferralInfo, pendingFeesUsd, isPnlInLeverage } =
    p;
  const { marketInfo, collateralToken } = position;

  if (!marketInfo || minCollateralUsd === undefined) {
    return undefined;
  }

  const valuationPrice = getMarginDepositValuationPrice({
    collateralToken,
    indexToken: marketInfo.indexToken,
    triggerPrice,
  });

  const depositUsdAtTrigger = convertToUsd(depositAmount, collateralToken.decimals, valuationPrice)!;

  const nextCollateralUsd = position.collateralUsd - pendingFeesUsd + depositUsdAtTrigger;
  // derived in token units so the index-token-collateral branch of getLiquidationPrice stays exact
  const nextCollateralAmount =
    position.collateralAmount +
    convertToTokenAmount(depositUsdAtTrigger - pendingFeesUsd, collateralToken.decimals, valuationPrice)!;

  const pnlAtTrigger =
    triggerPrice !== undefined && triggerPrice > 0n
      ? getPositionPnlUsd({
          marketInfo,
          sizeInUsd: position.sizeInUsd,
          sizeInTokens: position.sizeInTokens,
          markPrice: triggerPrice,
          isLong: position.isLong,
        })
      : position.pnl;

  const nextLeverage = getLeverage({
    sizeInUsd: position.sizeInUsd,
    collateralUsd: nextCollateralUsd,
    pendingBorrowingFeesUsd: 0n,
    pendingFundingFeesUsd: 0n,
    pnl: isPnlInLeverage === true ? pnlAtTrigger : 0n,
  });

  const nextLiqPrice = getLiquidationPrice({
    sizeInUsd: position.sizeInUsd,
    sizeInTokens: position.sizeInTokens,
    collateralUsd: nextCollateralUsd,
    collateralAmount: nextCollateralAmount,
    collateralToken,
    marketInfo,
    pendingImpactAmount: position.pendingImpactAmount,
    userReferralInfo,
    pendingFundingFeesUsd: 0n,
    pendingBorrowingFeesUsd: 0n,
    isLong: position.isLong,
    minCollateralUsd,
  });

  return {
    depositUsdAtTrigger,
    nextCollateralUsd,
    nextCollateralAmount,
    nextLeverage,
    nextLiqPrice,
  };
}

export type MarginDepositRiskLevel = "insufficient" | "beyondCurrentLiq";

function getIsComparableLiqPrice(liqPrice: bigint | undefined): liqPrice is bigint {
  return liqPrice !== undefined && liqPrice > 0n && liqPrice < maxUint256;
}

/**
 * "insufficient" — the position would still be liquidatable at the trigger price after the deposit.
 * "beyondCurrentLiq" — the deposit is enough, but the trigger sits at or beyond the current liquidation price.
 */
export function getMarginDepositRiskLevel(p: {
  isLong: boolean;
  triggerPrice: bigint | undefined;
  currentLiqPrice: bigint | undefined;
  nextLiqPrice: bigint | undefined;
}): MarginDepositRiskLevel | undefined {
  const { isLong, triggerPrice, currentLiqPrice, nextLiqPrice } = p;

  if (triggerPrice === undefined || triggerPrice <= 0n) {
    return undefined;
  }

  if (getIsComparableLiqPrice(nextLiqPrice)) {
    const isStillLiquidatable = isLong ? triggerPrice <= nextLiqPrice : triggerPrice >= nextLiqPrice;

    if (isStillLiquidatable) {
      return "insufficient";
    }
  }

  if (getIsComparableLiqPrice(currentLiqPrice)) {
    const isBeyondCurrentLiq = isLong ? triggerPrice <= currentLiqPrice : triggerPrice >= currentLiqPrice;

    if (isBeyondCurrentLiq) {
      return "beyondCurrentLiq";
    }
  }

  return undefined;
}
