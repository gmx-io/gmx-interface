import { t } from "@lingui/macro";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { UserReferralInfo } from "domain/referrals";
import {
  MarketInfo,
  getCappedPoolPnl,
  getMarketPnl,
  getOpenInterestUsd,
  getPoolUsdWithoutPnl,
} from "domain/synthetics/markets";
import { Token } from "domain/tokens";
import { getIsEquivalentTokens } from "sdk/utils/tokens";
import { ethers } from "ethers";
import { bigMath } from "sdk/utils/bigmath";
import { CHART_PERIODS } from "lib/legacy";
import {
  applyFactor,
  expandDecimals,
  formatAmount,
  formatUsd,
  calculateDisplayDecimals,
  PRECISION,
  formatUsdPrice,
} from "lib/numbers";
import { getBorrowingFeeRateUsd, getFundingFeeRateUsd, getPositionFee, getPriceImpactForPosition } from "../fees";
import { OrderType } from "../orders/types";
import { TokenData, convertToUsd } from "../tokens";
import { PositionInfo, PositionInfoLoaded } from "./types";

export * from "sdk/utils/positions";

export function getPositionValueUsd(p: { indexToken: Token; sizeInTokens: bigint; markPrice: bigint }) {
  const { indexToken, sizeInTokens, markPrice } = p;

  return convertToUsd(sizeInTokens, indexToken.decimals, markPrice)!;
}

export function getPositionPendingFeesUsd(p: { pendingFundingFeesUsd: bigint; pendingBorrowingFeesUsd: bigint }) {
  const { pendingFundingFeesUsd, pendingBorrowingFeesUsd } = p;

  return pendingBorrowingFeesUsd + pendingFundingFeesUsd;
}

export function getPositionNetValue(p: {
  collateralUsd: bigint;
  pendingFundingFeesUsd: bigint;
  pendingBorrowingFeesUsd: bigint;
  pnl: bigint;
  closingFeeUsd: bigint;
  uiFeeUsd: bigint;
}) {
  const { pnl, closingFeeUsd, collateralUsd, uiFeeUsd } = p;

  const pendingFeesUsd = getPositionPendingFeesUsd(p);

  return collateralUsd - pendingFeesUsd - closingFeeUsd - uiFeeUsd + pnl;
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

  if (totalPnl <= 0n) {
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

  if (cappedPnl !== poolPnl && cappedPnl > 0n && poolPnl > 0n) {
    totalPnl = bigMath.mulDiv(totalPnl, cappedPnl / WEI_PRECISION, poolPnl / WEI_PRECISION);
  }

  return totalPnl;
}

export function getLiquidationPrice(p: {
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  collateralAmount: bigint;
  collateralUsd: bigint;
  collateralToken: TokenData;
  marketInfo: MarketInfo | undefined;
  pendingFundingFeesUsd: bigint;
  pendingBorrowingFeesUsd: bigint;
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
    minCollateralUsd,
    isLong,
    userReferralInfo,
    useMaxPriceImpact,
  } = p;

  if (sizeInUsd <= 0n || sizeInTokens <= 0n || !marketInfo) {
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
    priceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, -sizeInUsd, isLong, { fallbackToZero: true });

    if (priceImpactDeltaUsd < maxNegativePriceImpactUsd) {
      priceImpactDeltaUsd = maxNegativePriceImpactUsd;
    }

    // Ignore positive price impact
    if (priceImpactDeltaUsd > 0n) {
      priceImpactDeltaUsd = 0n;
    }
  }

  let liquidationCollateralUsd = applyFactor(sizeInUsd, marketInfo.minCollateralFactor);
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

  if (liquidationPrice <= 0n) {
    return undefined;
  }

  return liquidationPrice;
}

export function formatLiquidationPrice(
  liquidationPrice?: bigint,
  opts: { displayDecimals?: number; visualMultiplier?: number } = {}
) {
  if (liquidationPrice === undefined || liquidationPrice < 0n) {
    return "NA";
  }
  const priceDecimalPlaces = calculateDisplayDecimals(liquidationPrice, undefined, opts.visualMultiplier);

  return formatUsd(liquidationPrice, {
    ...opts,
    displayDecimals: opts.displayDecimals ?? priceDecimalPlaces,
    maxThreshold: "1000000",
  });
}

export function formatAcceptablePrice(acceptablePrice?: bigint, opts: { visualMultiplier?: number } = {}) {
  if (acceptablePrice !== undefined && (acceptablePrice == 0n || acceptablePrice >= ethers.MaxInt256)) {
    return "NA";
  }

  return formatUsdPrice(acceptablePrice, {
    ...opts,
  });
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

  if (remainingCollateralUsd <= 0n) {
    return undefined;
  }

  return bigMath.mulDiv(sizeInUsd, BASIS_POINTS_DIVISOR_BIGINT, remainingCollateralUsd);
}

export function formatLeverage(leverage?: bigint) {
  if (leverage === undefined) return undefined;

  return `${formatAmount(leverage, 4, 2)}x`;
}

export function getEstimatedLiquidationTimeInHours(
  position: PositionInfo,
  minCollateralUsd: bigint | undefined
): number | undefined {
  const { marketInfo, isLong, sizeInUsd, isOpening, netValue } = position;

  if (isOpening || minCollateralUsd === undefined || !marketInfo) return;

  let liquidationCollateralUsd = applyFactor(sizeInUsd, marketInfo.minCollateralFactor);
  if (liquidationCollateralUsd < minCollateralUsd) {
    liquidationCollateralUsd = minCollateralUsd;
  }
  const borrowFeePerHour = getBorrowingFeeRateUsd(marketInfo, isLong, sizeInUsd, CHART_PERIODS["1h"]);
  const fundingFeePerHour = getFundingFeeRateUsd(marketInfo, isLong, sizeInUsd, CHART_PERIODS["1h"]);
  const maxNegativePriceImpactUsd = -1n * applyFactor(sizeInUsd, marketInfo.maxPositionImpactFactorForLiquidations);
  let priceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, -sizeInUsd, isLong, {
    fallbackToZero: true,
  });

  if (priceImpactDeltaUsd < maxNegativePriceImpactUsd) {
    priceImpactDeltaUsd = maxNegativePriceImpactUsd;
  }

  // Ignore positive price impact
  if (priceImpactDeltaUsd > 0n) {
    priceImpactDeltaUsd = 0n;
  }

  const totalFeesPerHour =
    bigMath.abs(borrowFeePerHour) + (fundingFeePerHour < 0n ? bigMath.abs(fundingFeePerHour) : 0n);

  if (totalFeesPerHour == 0n) return;

  const hours =
    ((netValue + priceImpactDeltaUsd - liquidationCollateralUsd) * BASIS_POINTS_DIVISOR_BIGINT) / totalFeesPerHour;

  return parseFloat(formatAmount(hours, 4, 2));
}

export function formatEstimatedLiquidationTime(hours?: number | undefined) {
  if (!hours) return;
  const days = Math.floor(hours / 24);

  if (hours < 1) {
    return `< 1 hour`;
  }

  if (days > 1000) {
    return "> 1000 days";
  }
  if (hours < 24) {
    const hoursInt = Math.floor(hours);
    return `${hoursInt} ${hoursInt === 1 ? "hour" : "hours"}`;
  }

  return `${days} days`;
}

export function getNameByOrderType(orderType: OrderType | undefined, opts: { abbr?: boolean; lower?: boolean } = {}) {
  const { abbr, lower } = opts;

  if (orderType === OrderType.LimitDecrease) {
    if (abbr) {
      return t`TP`;
    }

    if (lower) {
      return t`take profit`;
    }

    return t`Take Profit`;
  }

  if (orderType === OrderType.StopLossDecrease) {
    if (abbr) {
      return t`SL`;
    }

    if (lower) {
      return t`stop loss`;
    }

    return t`Stop Loss`;
  }

  if (orderType === OrderType.StopIncrease) {
    if (lower) {
      return t`stop market`;
    }

    return t`Stop Market`;
  }

  if (orderType === OrderType.LimitIncrease || orderType === OrderType.LimitSwap) {
    if (lower) {
      return t`limit`;
    }

    return t`Limit`;
  }

  if (abbr) {
    return t`T`;
  }

  if (lower) {
    return t`trigger`;
  }

  return t`Trigger`;
}

function willPositionCollateralBeSufficient(
  collateralTokenMinPrice: bigint,
  collateralAmount: bigint,
  collateralDeltaAmount: bigint,
  collateralTokenDecimals: number,
  realizedPnlUsd: bigint,
  minCollateralFactor: bigint,
  sizeInUsd: bigint
) {
  let remainingCollateralUsd = bigMath.mulDiv(
    collateralAmount - collateralDeltaAmount,
    collateralTokenMinPrice,
    expandDecimals(1, collateralTokenDecimals)
  );

  if (realizedPnlUsd < 0n) {
    remainingCollateralUsd = remainingCollateralUsd + realizedPnlUsd;
  }

  if (remainingCollateralUsd < 0n) {
    return false;
  }

  const minCollateralUsdForLeverage = applyFactor(sizeInUsd, minCollateralFactor);

  return remainingCollateralUsd >= minCollateralUsdForLeverage;
}

export function willPositionCollateralBeSufficientForPosition(
  position: PositionInfo,
  collateralDeltaAmount: bigint,
  realizedPnlUsd: bigint,
  minCollateralFactor: bigint,
  sideDeltaUsd: bigint
) {
  return willPositionCollateralBeSufficient(
    position.collateralToken.prices.minPrice,
    position.collateralAmount,
    collateralDeltaAmount,
    position.collateralToken.decimals,
    realizedPnlUsd,
    minCollateralFactor,
    position.sizeInUsd + sideDeltaUsd
  );
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

export function getIsPositionInfoLoaded(pos: PositionInfo | PositionInfoLoaded | undefined): pos is PositionInfoLoaded {
  return Boolean(pos?.marketInfo);
}

// 1% slippage
export function substractMaxLeverageSlippage(number: bigint): bigint;
export function substractMaxLeverageSlippage(number: number): number;
export function substractMaxLeverageSlippage(number: bigint | number): bigint | number {
  if (typeof number === "number") {
    return Math.floor(number * 0.99);
  }
  return (number * 99n) / 100n;
}
