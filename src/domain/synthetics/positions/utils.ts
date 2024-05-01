import { UserReferralInfo } from "domain/referrals";
import { MarketInfo, getCappedPoolPnl, getOpenInterestUsd, getPoolUsdWithoutPnl } from "domain/synthetics/markets";
import { Token, getIsEquivalentTokens } from "domain/tokens";
import { ethers } from "ethers";
import { CHART_PERIODS, PRECISION } from "lib/legacy";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { applyFactor, expandDecimals, formatAmount, formatUsd } from "lib/numbers";
import { getBorrowingFeeRateUsd, getFundingFeeRateUsd, getPositionFee, getPriceImpactForPosition } from "../fees";
import { TokenData, convertToUsd } from "../tokens";
import { PositionInfo } from "./types";
import { OrderType } from "../orders/types";
import { t } from "@lingui/macro";

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

  return (sizeInUsd / sizeInTokens) * expandDecimals(1, indexToken.decimals);
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

  if (totalPnl <= 0) {
    return totalPnl;
  }

  const poolPnl = isLong ? p.marketInfo.pnlLongMax : p.marketInfo.pnlShortMax;
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, "minPrice");

  const cappedPnl = getCappedPoolPnl({
    marketInfo,
    poolUsd,
    isLong,
    maximize: true,
  });

  const WEI_PRECISION = expandDecimals(1, 18);

  if (!cappedPnl.eq(poolPnl) && cappedPnl.gt(0) && poolPnl.gt(0)) {
    totalPnl = totalPnl.mul(cappedPnl.div(WEI_PRECISION)).div(poolPnl.div(WEI_PRECISION));
  }

  return totalPnl;
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

  if (!sizeInUsd.gt(0) || !sizeInTokens.gt(0)) {
    return undefined;
  }

  const { indexToken } = marketInfo;

  const closingFeeUsd = getPositionFee(marketInfo, sizeInUsd, false, userReferralInfo).positionFeeUsd;
  const totalPendingFeesUsd = getPositionPendingFeesUsd({ pendingFundingFeesUsd, pendingBorrowingFeesUsd });
  const totalFeesUsd = totalPendingFeesUsd.add(closingFeeUsd);

  const maxNegativePriceImpactUsd = applyFactor(sizeInUsd, marketInfo.maxPositionImpactFactorForLiquidations).mul(-1);

  let priceImpactDeltaUsd: BigNumber = 0n;

  if (useMaxPriceImpact) {
    priceImpactDeltaUsd = maxNegativePriceImpactUsd;
  } else {
    priceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, sizeInUsd.mul(-1), isLong, { fallbackToZero: true });

    if (priceImpactDeltaUsd.lt(maxNegativePriceImpactUsd)) {
      priceImpactDeltaUsd = maxNegativePriceImpactUsd;
    }

    // Ignore positive price impact
    if (priceImpactDeltaUsd.gt(0)) {
      priceImpactDeltaUsd = 0n;
    }
  }

  let liquidationCollateralUsd = applyFactor(sizeInUsd, marketInfo.minCollateralFactor);
  if (liquidationCollateralUsd.lt(minCollateralUsd)) {
    liquidationCollateralUsd = minCollateralUsd;
  }

  let liquidationPrice: bigint;

  if (getIsEquivalentTokens(collateralToken, indexToken)) {
    if (isLong) {
      const denominator = sizeInTokens.add(collateralAmount);

      if (denominator == 0n) {
        return undefined;
      }

      liquidationPrice = sizeInUsd
        .add(liquidationCollateralUsd)
        .sub(priceImpactDeltaUsd)
        .add(totalFeesUsd)
        .div(denominator)
        .mul(expandDecimals(1, indexToken.decimals));
    } else {
      const denominator = sizeInTokens.sub(collateralAmount);

      if (denominator == 0n) {
        return undefined;
      }

      liquidationPrice = sizeInUsd
        .sub(liquidationCollateralUsd)
        .add(priceImpactDeltaUsd)
        .sub(totalFeesUsd)
        .div(denominator)
        .mul(expandDecimals(1, indexToken.decimals));
    }
  } else {
    if (sizeInTokens == 0n) {
      return undefined;
    }

    const remainingCollateralUsd = collateralUsd.add(priceImpactDeltaUsd).sub(totalPendingFeesUsd).sub(closingFeeUsd);

    if (isLong) {
      liquidationPrice = liquidationCollateralUsd
        .sub(remainingCollateralUsd)
        .add(sizeInUsd)
        .div(sizeInTokens)
        .mul(expandDecimals(1, indexToken.decimals));
    } else {
      liquidationPrice = liquidationCollateralUsd
        .sub(remainingCollateralUsd)
        .sub(sizeInUsd)
        .div(sizeInTokens.mul(-1))
        .mul(expandDecimals(1, indexToken.decimals));
    }
  }

  if (liquidationPrice.lte(0)) {
    return undefined;
  }

  return liquidationPrice;
}

export function formatLiquidationPrice(liquidationPrice?: bigint, opts: { displayDecimals?: number } = {}) {
  if (!liquidationPrice || liquidationPrice.lte(0)) {
    return "NA";
  }

  return formatUsd(liquidationPrice, { ...opts, maxThreshold: "1000000" });
}

export function formatAcceptablePrice(acceptablePrice?: bigint, opts: { displayDecimals?: number } = {}) {
  if (acceptablePrice && (acceptablePrice == 0n || acceptablePrice.gte(ethers.constants.MaxInt256))) {
    return "NA";
  }

  return formatUsd(acceptablePrice, { ...opts });
}

export function getLeverage(p: {
  sizeInUsd: bigint;
  collateralUsd: bigint;
  pnl: BigNumber | undefined;
  pendingFundingFeesUsd: bigint;
  pendingBorrowingFeesUsd: bigint;
}) {
  const { pnl, sizeInUsd, collateralUsd, pendingBorrowingFeesUsd, pendingFundingFeesUsd } = p;

  const totalPendingFeesUsd = getPositionPendingFeesUsd({ pendingFundingFeesUsd, pendingBorrowingFeesUsd });

  const remainingCollateralUsd = collateralUsd.add(pnl || 0).sub(totalPendingFeesUsd);

  if (remainingCollateralUsd.lte(0)) {
    return undefined;
  }

  return sizeInUsd.mul(BASIS_POINTS_DIVISOR).div(remainingCollateralUsd);
}

export function formatLeverage(leverage?: bigint) {
  if (!leverage) return undefined;

  return `${formatAmount(leverage, 4, 2)}x`;
}

export function getEstimatedLiquidationTimeInHours(
  position: PositionInfo,
  minCollateralUsd: BigNumber | undefined
): number | undefined {
  const { marketInfo, isLong, sizeInUsd, isOpening, netValue } = position;

  if (isOpening || !minCollateralUsd) return;

  let liquidationCollateralUsd = applyFactor(sizeInUsd, marketInfo.minCollateralFactor);
  if (liquidationCollateralUsd.lt(minCollateralUsd)) {
    liquidationCollateralUsd = minCollateralUsd;
  }
  const borrowFeePerHour = getBorrowingFeeRateUsd(marketInfo, isLong, sizeInUsd, CHART_PERIODS["1h"]);
  const fundingFeePerHour = getFundingFeeRateUsd(marketInfo, isLong, sizeInUsd, CHART_PERIODS["1h"]);
  const maxNegativePriceImpactUsd = applyFactor(sizeInUsd, marketInfo.maxPositionImpactFactorForLiquidations).mul(-1);
  let priceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, sizeInUsd.mul(-1), isLong, {
    fallbackToZero: true,
  });

  if (priceImpactDeltaUsd.lt(maxNegativePriceImpactUsd)) {
    priceImpactDeltaUsd = maxNegativePriceImpactUsd;
  }

  // Ignore positive price impact
  if (priceImpactDeltaUsd.gt(0)) {
    priceImpactDeltaUsd = 0n;
  }

  const totalFeesPerHour = borrowFeePerHour.abs().add(fundingFeePerHour.lt(0) ? fundingFeePerHour.abs() : 0);

  if (totalFeesPerHour == 0n) return;

  const hours = netValue
    .add(priceImpactDeltaUsd)
    .sub(liquidationCollateralUsd)
    .mul(BASIS_POINTS_DIVISOR)
    .div(totalFeesPerHour);
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

export function getTriggerNameByOrderType(orderType: OrderType | undefined, abbr = false) {
  const triggerStr = abbr ? t`T` : t`Trigger`;
  const takeProfitStr = abbr ? t`TP` : t`Take-Profit`;
  const stopLossStr = abbr ? t`SL` : t`Stop-Loss`;

  if (orderType === OrderType.LimitDecrease) {
    return takeProfitStr;
  }

  if (orderType === OrderType.StopLossDecrease) {
    return stopLossStr;
  }

  return triggerStr;
}

function willPositionCollateralBeSufficient(
  collateralTokenMinPrice: bigint,
  collateralAmount: bigint,
  collateralDeltaAmount: bigint,
  collateralTokenDecimals: number,
  realizedPnlUsd: bigint,
  minCollateralFactor: bigint,
  sizeInUsd: BigNumber
) {
  let remainingCollateralUsd = collateralAmount
    .sub(collateralDeltaAmount)
    .mul(collateralTokenMinPrice)
    .div(expandDecimals(1, collateralTokenDecimals));

  if (realizedPnlUsd.lt(0)) {
    remainingCollateralUsd = remainingCollateralUsd.add(realizedPnlUsd);
  }

  if (remainingCollateralUsd.lt(0)) {
    return false;
  }

  const minCollateralUsdForLeverage = applyFactor(sizeInUsd, minCollateralFactor);

  return remainingCollateralUsd.gte(minCollateralUsdForLeverage);
}

export function willPositionCollateralBeSufficientForPosition(
  position: PositionInfo,
  collateralDeltaAmount: bigint,
  realizedPnlUsd: bigint,
  minCollateralFactor: bigint,
  sideDeltaUsd: BigNumber
) {
  return willPositionCollateralBeSufficient(
    position.collateralToken.prices.minPrice,
    position.collateralAmount,
    collateralDeltaAmount,
    position.collateralToken.decimals,
    realizedPnlUsd,
    minCollateralFactor,
    position.sizeInUsd.add(sideDeltaUsd)
  );
}

export function getMinCollateralFactorForPosition(position: PositionInfo, openInterestDelta: BigNumber) {
  const marketInfo = position.marketInfo;
  const isLong = position.isLong;
  const openInterest = getOpenInterestUsd(marketInfo, isLong).add(openInterestDelta);
  const minCollateralFactorMultiplier = isLong
    ? marketInfo.minCollateralFactorForOpenInterestLong
    : marketInfo.minCollateralFactorForOpenInterestShort;
  let minCollateralFactor = openInterest.mul(minCollateralFactorMultiplier).div(PRECISION);
  const minCollateralFactorForMarket = marketInfo.minCollateralFactor;

  if (minCollateralFactorForMarket.gt(minCollateralFactor)) {
    minCollateralFactor = minCollateralFactorForMarket;
  }

  return minCollateralFactor;
}

// 1% slippage
export function substractMaxLeverageSlippage(number: BigNumber): bigint;
export function substractMaxLeverageSlippage(number: number): number;
export function substractMaxLeverageSlippage(number: BigNumber | number): BigNumber | number {
  if (typeof number === "number") {
    return Math.floor(number * 0.99);
  }
  return number.mul(99).div(100);
}
