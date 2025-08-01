import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";
import { MarketInfo } from "types/markets";
import { PositionInfoLoaded } from "types/positions";
import { UserReferralInfo } from "types/referrals";
import { Token, TokenData } from "types/tokens";

import { bigMath } from "./bigmath";
import {
  capPositionImpactUsdByMaxImpactPool,
  capPositionImpactUsdByMaxPriceImpactFactor,
  getMaxPositionImpactFactors,
  getPositionFee,
  getPriceImpactForPosition,
  getProportionalPendingImpactValues,
} from "./fees";
import { getCappedPoolPnl, getMarketPnl, getOpenInterestUsd, getPoolUsdWithoutPnl } from "./markets";
import { applyFactor, expandDecimals, PRECISION } from "./numbers";
import { convertToUsd, getIsEquivalentTokens } from "./tokens";

export function getPositionKey(account: string, marketAddress: string, collateralAddress: string, isLong: boolean) {
  return `${account}:${marketAddress}:${collateralAddress}:${isLong}`;
}

export function parsePositionKey(positionKey: string) {
  const [account, marketAddress, collateralAddress, isLong] = positionKey.split(":");

  return { account, marketAddress, collateralAddress, isLong: isLong === "true" };
}

export function getEntryPrice(p: { sizeInUsd: bigint; sizeInTokens: bigint; indexToken: Token }) {
  const { sizeInUsd, sizeInTokens, indexToken } = p;

  if (sizeInTokens <= 0) {
    return undefined;
  }

  return bigMath.mulDiv(sizeInUsd, expandDecimals(1, indexToken.decimals), sizeInTokens);
}

export function getPositionPnlUsd(p: {
  marketInfo: MarketInfo;
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  markPrice: bigint;
  isLong: boolean;
}) {
  const { marketInfo, sizeInUsd, sizeInTokens, markPrice, isLong } = p;

  const positionValueUsd = getPositionValueUsd({ indexToken: marketInfo.indexToken, sizeInTokens, markPrice });

  let totalPnl = isLong ? positionValueUsd - sizeInUsd : sizeInUsd - positionValueUsd;

  if (totalPnl <= 0) {
    return totalPnl;
  }

  const poolPnl = getMarketPnl(marketInfo, isLong, true);
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, "minPrice");

  const cappedPnl = getCappedPoolPnl({
    marketInfo,
    poolUsd,
    poolPnl,
    isLong,
  });

  const WEI_PRECISION = expandDecimals(1, 18);

  if (cappedPnl !== poolPnl && cappedPnl > 0 && poolPnl > 0) {
    totalPnl = bigMath.mulDiv(totalPnl, cappedPnl / WEI_PRECISION, poolPnl / WEI_PRECISION);
  }

  return totalPnl;
}

export function getPositionValueUsd(p: { indexToken: Token; sizeInTokens: bigint; markPrice: bigint }) {
  const { indexToken, sizeInTokens, markPrice } = p;

  return convertToUsd(sizeInTokens, indexToken.decimals, markPrice)!;
}

export function getPositionPendingFeesUsd(p: { pendingFundingFeesUsd: bigint; pendingBorrowingFeesUsd: bigint }) {
  const { pendingFundingFeesUsd, pendingBorrowingFeesUsd } = p;

  return pendingBorrowingFeesUsd + pendingFundingFeesUsd;
}

export function getPositionNetValue(p: {
  totalPendingImpactDeltaUsd: bigint;
  priceImpactDiffUsd: bigint;
  collateralUsd: bigint;
  pendingFundingFeesUsd: bigint;
  pendingBorrowingFeesUsd: bigint;
  pnl: bigint;
  closingFeeUsd: bigint;
  uiFeeUsd: bigint;
}) {
  const { pnl, closingFeeUsd, collateralUsd, uiFeeUsd, totalPendingImpactDeltaUsd, priceImpactDiffUsd } = p;

  const pendingFeesUsd = getPositionPendingFeesUsd(p);

  return (
    collateralUsd - pendingFeesUsd - closingFeeUsd - uiFeeUsd + pnl + totalPendingImpactDeltaUsd + priceImpactDiffUsd
  );
}

export function getPositionPnlAfterFees({
  pnl,
  pendingBorrowingFeesUsd,
  pendingFundingFeesUsd,
  closingFeeUsd,
  uiFeeUsd,
  totalPendingImpactDeltaUsd,
  priceImpactDiffUsd,
}: {
  pnl: bigint;
  pendingBorrowingFeesUsd: bigint;
  pendingFundingFeesUsd: bigint;
  closingFeeUsd: bigint;
  uiFeeUsd: bigint;
  totalPendingImpactDeltaUsd: bigint;
  priceImpactDiffUsd: bigint;
}) {
  const pnlAfterFees =
    pnl -
    pendingBorrowingFeesUsd -
    pendingFundingFeesUsd -
    closingFeeUsd -
    uiFeeUsd +
    totalPendingImpactDeltaUsd +
    priceImpactDiffUsd;

  return pnlAfterFees;
}

export function getLeverage(p: {
  sizeInUsd: bigint;
  collateralUsd: bigint;
  pnl: bigint | undefined;
  pendingFundingFeesUsd: bigint;
  pendingBorrowingFeesUsd: bigint;
}) {
  const { pnl, sizeInUsd, collateralUsd, pendingBorrowingFeesUsd, pendingFundingFeesUsd } = p;

  const totalPendingFeesUsd = getPositionPendingFeesUsd({ pendingFundingFeesUsd, pendingBorrowingFeesUsd });

  const remainingCollateralUsd = collateralUsd + (pnl ?? 0n) - totalPendingFeesUsd;

  if (remainingCollateralUsd <= 0) {
    return undefined;
  }

  return bigMath.mulDiv(sizeInUsd, BASIS_POINTS_DIVISOR_BIGINT, remainingCollateralUsd);
}

export function getLiquidationPrice(p: {
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  collateralAmount: bigint;
  collateralUsd: bigint;
  collateralToken: TokenData;
  marketInfo: MarketInfo;
  pendingFundingFeesUsd: bigint;
  pendingBorrowingFeesUsd: bigint;
  pendingImpactAmount: bigint;
  minCollateralUsd: bigint;
  isLong: boolean;
  useMaxPriceImpact?: boolean;
  userReferralInfo: UserReferralInfo | undefined;
}) {
  const {
    sizeInUsd,
    sizeInTokens,
    collateralUsd,
    collateralAmount,
    marketInfo,
    collateralToken,
    pendingFundingFeesUsd,
    pendingBorrowingFeesUsd,
    pendingImpactAmount,
    minCollateralUsd,
    isLong,
    userReferralInfo,
    useMaxPriceImpact,
  } = p;

  if (sizeInUsd <= 0 || sizeInTokens <= 0) {
    return undefined;
  }

  const { indexToken } = marketInfo;

  const closingFeeUsd = getPositionFee(marketInfo, sizeInUsd, false, userReferralInfo).positionFeeUsd;
  const totalPendingFeesUsd = getPositionPendingFeesUsd({ pendingFundingFeesUsd, pendingBorrowingFeesUsd });
  const totalFeesUsd = totalPendingFeesUsd + closingFeeUsd;

  const maxNegativePriceImpactUsd = -1n * applyFactor(sizeInUsd, marketInfo.maxPositionImpactFactorForLiquidations);

  let priceImpactDeltaUsd = 0n;

  if (useMaxPriceImpact) {
    priceImpactDeltaUsd = maxNegativePriceImpactUsd;
  } else {
    const priceImapctForPosition = getPriceImpactForPosition(marketInfo, -sizeInUsd, isLong, { fallbackToZero: true });
    priceImpactDeltaUsd = priceImapctForPosition.priceImpactDeltaUsd;

    if (priceImpactDeltaUsd > 0) {
      priceImpactDeltaUsd = capPositionImpactUsdByMaxPriceImpactFactor(marketInfo, sizeInUsd, priceImpactDeltaUsd);
    }

    const pendingImpactUsd = convertToUsd(
      pendingImpactAmount,
      marketInfo.indexToken.decimals,
      pendingImpactAmount > 0 ? marketInfo.indexToken.prices.minPrice : marketInfo.indexToken.prices.maxPrice
    )!;

    priceImpactDeltaUsd = priceImpactDeltaUsd + pendingImpactUsd;

    if (priceImpactDeltaUsd > 0) {
      priceImpactDeltaUsd = 0n;
    } else if (priceImpactDeltaUsd < maxNegativePriceImpactUsd) {
      priceImpactDeltaUsd = maxNegativePriceImpactUsd;
    }
  }

  let liquidationCollateralUsd = applyFactor(sizeInUsd, marketInfo.minCollateralFactorForLiquidation);
  if (liquidationCollateralUsd < minCollateralUsd) {
    liquidationCollateralUsd = minCollateralUsd;
  }

  let liquidationPrice: bigint;

  if (getIsEquivalentTokens(collateralToken, indexToken)) {
    if (isLong) {
      const denominator = sizeInTokens + collateralAmount;

      if (denominator == 0n) {
        return undefined;
      }

      liquidationPrice =
        ((sizeInUsd + liquidationCollateralUsd - priceImpactDeltaUsd + totalFeesUsd) / denominator) *
        expandDecimals(1, indexToken.decimals);
    } else {
      const denominator = sizeInTokens - collateralAmount;

      if (denominator == 0n) {
        return undefined;
      }

      liquidationPrice =
        ((sizeInUsd - liquidationCollateralUsd + priceImpactDeltaUsd - totalFeesUsd) / denominator) *
        expandDecimals(1, indexToken.decimals);
    }
  } else {
    if (sizeInTokens == 0n) {
      return undefined;
    }

    const remainingCollateralUsd = collateralUsd + priceImpactDeltaUsd - totalPendingFeesUsd - closingFeeUsd;

    if (isLong) {
      liquidationPrice =
        ((liquidationCollateralUsd - remainingCollateralUsd + sizeInUsd) / sizeInTokens) *
        expandDecimals(1, indexToken.decimals);
    } else {
      liquidationPrice =
        ((liquidationCollateralUsd - remainingCollateralUsd - sizeInUsd) / -sizeInTokens) *
        expandDecimals(1, indexToken.decimals);
    }
  }

  if (liquidationPrice <= 0) {
    return undefined;
  }

  return liquidationPrice;
}

export function getNetPriceImpactDeltaUsdForDecrease({
  marketInfo,
  sizeInUsd,
  pendingImpactAmount,
  priceImpactDeltaUsd,
  sizeDeltaUsd,
}: {
  marketInfo: MarketInfo;
  sizeInUsd: bigint;
  pendingImpactAmount: bigint;
  sizeDeltaUsd: bigint;
  priceImpactDeltaUsd: bigint;
}) {
  const { proportionalPendingImpactDeltaUsd } = getProportionalPendingImpactValues({
    sizeInUsd,
    sizeDeltaUsd,
    pendingImpactAmount,
    indexToken: marketInfo.indexToken,
  });

  let totalImpactDeltaUsd = priceImpactDeltaUsd + proportionalPendingImpactDeltaUsd;
  let priceImpactDiffUsd = 0n;

  if (totalImpactDeltaUsd < 0) {
    const { maxNegativeImpactFactor } = getMaxPositionImpactFactors(marketInfo);

    const maxNegativeImpactUsd = -applyFactor(sizeDeltaUsd, maxNegativeImpactFactor);

    if (totalImpactDeltaUsd < maxNegativeImpactUsd) {
      priceImpactDiffUsd = maxNegativeImpactUsd - totalImpactDeltaUsd;
    }
  }

  if (totalImpactDeltaUsd > 0) {
    totalImpactDeltaUsd = capPositionImpactUsdByMaxPriceImpactFactor(marketInfo, sizeDeltaUsd, totalImpactDeltaUsd);
  }

  totalImpactDeltaUsd = capPositionImpactUsdByMaxImpactPool(marketInfo, totalImpactDeltaUsd);

  return {
    totalImpactDeltaUsd,
    proportionalPendingImpactDeltaUsd,
    priceImpactDiffUsd,
  };
}

export function getMinCollateralFactorForPosition(position: PositionInfoLoaded, openInterestDelta: bigint) {
  const marketInfo = position.marketInfo;

  const isLong = position.isLong;
  const openInterest = getOpenInterestUsd(marketInfo, isLong) + openInterestDelta;
  const minCollateralFactorMultiplier = isLong
    ? marketInfo.minCollateralFactorForOpenInterestLong
    : marketInfo.minCollateralFactorForOpenInterestShort;
  let minCollateralFactor = bigMath.mulDiv(openInterest, minCollateralFactorMultiplier, PRECISION);
  const minCollateralFactorForMarket = marketInfo.minCollateralFactor;

  if (minCollateralFactorForMarket > minCollateralFactor) {
    minCollateralFactor = minCollateralFactorForMarket;
  }

  return minCollateralFactor;
}
