import { capPositionImpactUsdByMaxPriceImpactFactor, getPriceImpactForPosition } from "utils/fees";
import { getMarketInfoWithOpenInterestDelta, getPriceForPnl } from "utils/markets";
import { MarketInfo } from "utils/markets/types";
import { applyFactor, expandDecimals, roundUpMagnitudeDivision } from "utils/numbers";
import { getPositionPnlUsd } from "utils/positions";
import { UserReferralInfo } from "utils/referrals/types";
import { convertToTokenAmount, convertToUsd, getIsEquivalentTokens } from "utils/tokens";
import { TokenData } from "utils/tokens/types";

export enum PositionMarginFailureReason {
  MinCollateral = "min collateral",
  NonPositiveRemainingMargin = "< 0",
  MinCollateralForLeverage = "min collateral for leverage",
}

export type PositionMarginState = {
  isLiquidatable: boolean;
  reason: PositionMarginFailureReason | undefined;
  remainingCollateralUsd: bigint;
  minCollateralUsd: bigint;
  minCollateralUsdForLeverage: bigint;
};

export type PositionMarginStateParams = {
  marketInfo: MarketInfo;
  collateralToken: TokenData;
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  collateralAmount: bigint;
  pendingImpactAmount: bigint;
  minCollateralUsd: bigint;
  isLong: boolean;
  userReferralInfo: UserReferralInfo | undefined;
  forLiquidation?: boolean;
  shouldValidateMinCollateralUsd?: boolean;
};

export function getPositionMarginState(p: PositionMarginStateParams): PositionMarginState {
  const {
    marketInfo,
    collateralToken,
    sizeInUsd,
    sizeInTokens,
    collateralAmount,
    pendingImpactAmount,
    minCollateralUsd,
    isLong,
    userReferralInfo,
    forLiquidation = false,
    shouldValidateMinCollateralUsd = true,
  } = p;

  const { indexToken } = marketInfo;

  const positionPnlUsd = getPositionPnlUsd({
    marketInfo,
    sizeInUsd,
    sizeInTokens,
    markPrice: getPriceForPnl(indexToken.prices, isLong, false),
    isLong,
  });

  const collateralUsd = convertToUsd(collateralAmount, collateralToken.decimals, collateralToken.prices.minPrice)!;

  const { priceImpactDeltaUsd, balanceWasImproved } = getPriceImpactForPosition(marketInfo, -sizeInUsd, isLong, {
    fallbackToZero: true,
    sizeDeltaInTokens: sizeInTokens,
  });

  let totalImpactUsd = priceImpactDeltaUsd;

  if (totalImpactUsd > 0) {
    totalImpactUsd = capPositionImpactUsdByMaxPriceImpactFactor(marketInfo, sizeInUsd, totalImpactUsd);
  }

  const pendingImpactUsd = convertToUsd(
    pendingImpactAmount,
    indexToken.decimals,
    pendingImpactAmount > 0 ? indexToken.prices.minPrice : indexToken.prices.maxPrice
  )!;

  totalImpactUsd = totalImpactUsd + pendingImpactUsd;

  if (totalImpactUsd >= 0) {
    totalImpactUsd = 0n;
  } else {
    const maxNegativeImpactUsd = -applyFactor(sizeInUsd, marketInfo.maxPositionImpactFactorForLiquidations);

    if (totalImpactUsd < maxNegativeImpactUsd) {
      totalImpactUsd = maxNegativeImpactUsd;
    }
  }

  const closingFeeFactor = balanceWasImproved
    ? marketInfo.positionFeeFactorForBalanceWasImproved
    : marketInfo.positionFeeFactorForBalanceWasNotImproved;

  let closingFeeAmount =
    convertToTokenAmount(applyFactor(sizeInUsd, closingFeeFactor), collateralToken.decimals, collateralToken.prices.minPrice) ??
    0n;

  if (userReferralInfo) {
    const totalRebateAmount = applyFactor(closingFeeAmount, userReferralInfo.totalRebateFactor);
    const discountAmount = applyFactor(totalRebateAmount, userReferralInfo.discountFactor);
    closingFeeAmount -= discountAmount;
  }

  const closingCostUsd = convertToUsd(closingFeeAmount, collateralToken.decimals, collateralToken.prices.minPrice)!;

  const remainingCollateralUsd = collateralUsd + positionPnlUsd + totalImpactUsd - closingCostUsd;

  const minCollateralFactor = forLiquidation
    ? marketInfo.minCollateralFactorForLiquidation
    : marketInfo.minCollateralFactor;

  const minCollateralUsdForLeverage = applyFactor(sizeInUsd, minCollateralFactor);

  const state: Omit<PositionMarginState, "isLiquidatable" | "reason"> = {
    remainingCollateralUsd,
    minCollateralUsd,
    minCollateralUsdForLeverage,
  };

  if (shouldValidateMinCollateralUsd && remainingCollateralUsd < minCollateralUsd) {
    return { ...state, isLiquidatable: true, reason: PositionMarginFailureReason.MinCollateral };
  }

  if (remainingCollateralUsd <= 0) {
    return { ...state, isLiquidatable: true, reason: PositionMarginFailureReason.NonPositiveRemainingMargin };
  }

  if (remainingCollateralUsd < minCollateralUsdForLeverage) {
    return { ...state, isLiquidatable: true, reason: PositionMarginFailureReason.MinCollateralForLeverage };
  }

  return { ...state, isLiquidatable: false, reason: undefined };
}

export type IncreaseResultingPositionMarginStateParams = {
  marketInfo: MarketInfo;
  collateralToken: TokenData;
  isLong: boolean;
  existingPosition:
    | {
        sizeInUsd: bigint;
        sizeInTokens: bigint;
        collateralAmount: bigint;
        pendingImpactAmount: bigint;
      }
    | undefined;
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  collateralDeltaAmount: bigint;
  minCollateralUsd: bigint;
  userReferralInfo: UserReferralInfo | undefined;
  indexPriceForEvaluation?: bigint;
};

function withPriceOverride<T extends TokenData>(token: T, indexToken: TokenData, price: bigint): T {
  if (!getIsEquivalentTokens(token, indexToken)) {
    return token;
  }

  return { ...token, prices: { minPrice: price, maxPrice: price } };
}

export function getIncreaseResultingPositionMarginState(
  p: IncreaseResultingPositionMarginStateParams
): PositionMarginState | undefined {
  const {
    isLong,
    existingPosition,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    collateralDeltaAmount,
    minCollateralUsd,
    userReferralInfo,
    indexPriceForEvaluation,
  } = p;

  let { marketInfo, collateralToken } = p;

  if (sizeDeltaUsd <= 0n || sizeDeltaInTokens <= 0n) {
    return undefined;
  }

  if (indexPriceForEvaluation !== undefined && indexPriceForEvaluation > 0n) {
    const originalIndexToken = marketInfo.indexToken;
    marketInfo = {
      ...marketInfo,
      indexToken: withPriceOverride(marketInfo.indexToken, originalIndexToken, indexPriceForEvaluation),
      longToken: withPriceOverride(marketInfo.longToken, originalIndexToken, indexPriceForEvaluation),
      shortToken: withPriceOverride(marketInfo.shortToken, originalIndexToken, indexPriceForEvaluation),
    };
    collateralToken = withPriceOverride(collateralToken, originalIndexToken, indexPriceForEvaluation);
  }

  const { indexToken } = marketInfo;

  if (
    indexToken.prices.minPrice <= 0n ||
    indexToken.prices.maxPrice <= 0n ||
    collateralToken.prices.minPrice <= 0n
  ) {
    return undefined;
  }

  const increaseImpact = getPriceImpactForPosition(marketInfo, sizeDeltaUsd, isLong, {
    fallbackToZero: true,
    sizeDeltaInTokens,
  });

  let increaseImpactUsd = increaseImpact.priceImpactDeltaUsd;
  if (increaseImpactUsd > 0n) {
    increaseImpactUsd = capPositionImpactUsdByMaxPriceImpactFactor(marketInfo, sizeDeltaUsd, increaseImpactUsd);
  }

  const increasePendingImpactAmount =
    increaseImpactUsd > 0n
      ? convertToTokenAmount(increaseImpactUsd, indexToken.decimals, indexToken.prices.maxPrice)!
      : roundUpMagnitudeDivision(increaseImpactUsd * expandDecimals(1, indexToken.decimals), indexToken.prices.minPrice);

  const nextSizeInUsd = (existingPosition?.sizeInUsd ?? 0n) + sizeDeltaUsd;
  const nextSizeInTokens = (existingPosition?.sizeInTokens ?? 0n) + sizeDeltaInTokens;
  const nextCollateralAmount = (existingPosition?.collateralAmount ?? 0n) + collateralDeltaAmount;
  const nextPendingImpactAmount = (existingPosition?.pendingImpactAmount ?? 0n) + increasePendingImpactAmount;

  const nextMarketInfo = getMarketInfoWithOpenInterestDelta({
    marketInfo,
    isLong,
    sizeDeltaUsd,
    sizeDeltaInTokens,
  });

  return getPositionMarginState({
    marketInfo: nextMarketInfo,
    collateralToken,
    sizeInUsd: nextSizeInUsd,
    sizeInTokens: nextSizeInTokens,
    collateralAmount: nextCollateralAmount < 0n ? 0n : nextCollateralAmount,
    pendingImpactAmount: nextPendingImpactAmount,
    minCollateralUsd,
    isLong,
    userReferralInfo,
    forLiquidation: false,
  });
}
