import { MarketInfo, getCappedPoolPnl, getPoolUsd } from "domain/synthetics/markets";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { applyFactor, expandDecimals, formatAmount } from "lib/numbers";
import { convertToUsd } from "../tokens";

export function getPositionKey(account: string, marketAddress: string, collateralAddress: string, isLong: boolean) {
  return `${account}-${marketAddress}-${collateralAddress}-${isLong}`;
}

export function parsePositionKey(positionKey: string) {
  const [account, marketAddress, collateralAddress, isLong] = positionKey.split("-");

  return { account, marketAddress, collateralAddress, isLong: isLong === "true" };
}

export function getEntryPrice(p: { sizeInUsd: BigNumber; sizeInTokens: BigNumber; indexToken: Token }) {
  const { sizeInUsd, sizeInTokens, indexToken } = p;

  if (!sizeInTokens.gt(0)) {
    return undefined;
  }

  return sizeInUsd.div(sizeInTokens).mul(expandDecimals(1, indexToken.decimals));
}

export function getPositionValueUsd(p: { indexToken: Token; sizeInTokens: BigNumber; markPrice: BigNumber }) {
  const { indexToken, sizeInTokens, markPrice } = p;

  return convertToUsd(sizeInTokens, indexToken.decimals, markPrice)!;
}

export function getPositionPendingFeesUsd(p: { pendingFundingFeesUsd: BigNumber; pendingBorrowingFeesUsd: BigNumber }) {
  const { pendingFundingFeesUsd, pendingBorrowingFeesUsd } = p;

  if (pendingFundingFeesUsd.lt(0)) {
    return pendingBorrowingFeesUsd.add(pendingFundingFeesUsd.abs());
  }

  return pendingBorrowingFeesUsd;
}

export function getPositionNetValue(p: {
  collateralUsd: BigNumber;
  pendingFundingFeesUsd: BigNumber;
  pendingBorrowingFeesUsd: BigNumber;
  pnl: BigNumber;
  closingFeeUsd: BigNumber;
}) {
  const { pnl, closingFeeUsd, collateralUsd } = p;

  const pendingFeesUsd = getPositionPendingFeesUsd(p);

  return collateralUsd.sub(pendingFeesUsd).sub(closingFeeUsd).add(pnl);
}

export function getPositionPnlUsd(p: {
  marketInfo: MarketInfo;
  sizeInUsd: BigNumber;
  sizeInTokens: BigNumber;
  markPrice: BigNumber;
  isLong: boolean;
}) {
  const { marketInfo, sizeInUsd, sizeInTokens, markPrice, isLong } = p;

  const positionValueUsd = getPositionValueUsd({ indexToken: marketInfo.indexToken, sizeInTokens, markPrice });

  let totalPnl = isLong ? positionValueUsd.sub(sizeInUsd) : sizeInUsd.sub(positionValueUsd);

  if (totalPnl.lte(0)) {
    return totalPnl;
  }

  const poolPnl = isLong ? p.marketInfo.pnlLongMax : p.marketInfo.pnlShortMax;
  const poolUsd = getPoolUsd(marketInfo, isLong, "minPrice");

  const cappedPnl = getCappedPoolPnl({
    marketInfo,
    poolUsd,
    isLong,
    maximize: true,
    pnlFactorType: "FOR_TRADERS",
  });

  const WEI_PRECISION = expandDecimals(1, 18);

  if (!cappedPnl.eq(poolPnl) && cappedPnl.gt(0) && poolPnl.gt(0)) {
    totalPnl = totalPnl.mul(cappedPnl.div(WEI_PRECISION)).div(poolPnl.div(WEI_PRECISION));
  }

  return totalPnl;
}

export function getLiquidationPrice(p: {
  sizeInUsd: BigNumber;
  collateralUsd: BigNumber;
  pnl: BigNumber;
  markPrice: BigNumber;
  closingFeeUsd: BigNumber;
  maxPriceImpactFactor: BigNumber | undefined;
  pendingFundingFeesUsd: BigNumber;
  pendingBorrowingFeesUsd: BigNumber;
  minCollateralFactor: BigNumber;
  minCollateralUsd: BigNumber;
  isLong: boolean;
}) {
  const {
    sizeInUsd,
    collateralUsd,
    pnl,
    markPrice,
    closingFeeUsd,
    maxPriceImpactFactor,
    pendingFundingFeesUsd,
    pendingBorrowingFeesUsd,
    minCollateralFactor,
    minCollateralUsd,
    isLong,
  } = p;

  if (!sizeInUsd.gt(0)) {
    return undefined;
  }

  const totalPendingFeesUsd = getPositionPendingFeesUsd({ pendingFundingFeesUsd, pendingBorrowingFeesUsd });

  const maxNegativePriceImpactUsd = maxPriceImpactFactor
    ? applyFactor(sizeInUsd, maxPriceImpactFactor)
    : BigNumber.from(0);

  const totalFeesUsd = totalPendingFeesUsd.add(closingFeeUsd).add(maxNegativePriceImpactUsd);

  const remainingCollateralUsd = collateralUsd.sub(totalFeesUsd).add(pnl);

  const liqPriceForFees = getLiquidationPriceFromDelta({
    liquidationAmountUsd: totalFeesUsd,
    sizeInUsd,
    collateralUsd: remainingCollateralUsd,
    markPrice,
    isLong,
  });

  let minCollateralUsdForMaxLeverage = applyFactor(sizeInUsd, minCollateralFactor);

  if (minCollateralUsdForMaxLeverage.lt(minCollateralUsd)) {
    minCollateralUsdForMaxLeverage = minCollateralUsd;
  }

  const liqPriceForMaxLeverage = getLiquidationPriceFromDelta({
    liquidationAmountUsd: minCollateralUsdForMaxLeverage,
    sizeInUsd,
    collateralUsd: remainingCollateralUsd,
    markPrice,
    isLong,
  });

  let liquidationPrice: BigNumber;

  if (isLong) {
    // return the higher price
    liquidationPrice = liqPriceForFees.gt(liqPriceForMaxLeverage) ? liqPriceForFees : liqPriceForMaxLeverage;
  } else {
    liquidationPrice = liqPriceForFees.lt(liqPriceForMaxLeverage) ? liqPriceForFees : liqPriceForMaxLeverage;
  }

  if (liquidationPrice.lt(0)) {
    return BigNumber.from(0);
  }

  return liquidationPrice;
}

export function getLiquidationPriceFromDelta(p: {
  liquidationAmountUsd: BigNumber;
  sizeInUsd: BigNumber;
  collateralUsd: BigNumber;
  markPrice: BigNumber;
  isLong: boolean;
}) {
  if (p.liquidationAmountUsd.gt(p.collateralUsd)) {
    const liquidationDelta = p.liquidationAmountUsd.sub(p.collateralUsd);
    const priceDelta = liquidationDelta.mul(p.markPrice).div(p.sizeInUsd);

    return p.isLong ? p.markPrice.add(priceDelta) : p.markPrice.sub(priceDelta);
  }

  const liquidationDelta = p.collateralUsd.sub(p.liquidationAmountUsd);
  const priceDelta = liquidationDelta.mul(p.markPrice).div(p.sizeInUsd);

  return p.isLong ? p.markPrice.sub(priceDelta) : p.markPrice.add(priceDelta);
}

export function getLeverage(p: {
  sizeInUsd: BigNumber;
  collateralUsd: BigNumber;
  pnl: BigNumber | undefined;
  pendingFundingFeesUsd: BigNumber;
  pendingBorrowingFeesUsd: BigNumber;
}) {
  const { pnl, sizeInUsd: sizeUsd, collateralUsd, pendingBorrowingFeesUsd, pendingFundingFeesUsd } = p;

  const totalPendingFeesUsd = getPositionPendingFeesUsd({ pendingFundingFeesUsd, pendingBorrowingFeesUsd });

  const remainingCollateralUsd = collateralUsd.add(pnl || 0).sub(totalPendingFeesUsd);

  if (remainingCollateralUsd.lte(0)) {
    return undefined;
  }

  return sizeUsd.mul(BASIS_POINTS_DIVISOR).div(remainingCollateralUsd);
}

export function formatLeverage(leverage?: BigNumber) {
  if (!leverage) return undefined;

  return `${formatAmount(leverage, 4, 2)}x`;
}
