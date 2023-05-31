import { MarketInfo, getCappedPoolPnl, getPoolUsdWithoutPnl } from "domain/synthetics/markets";
import { Token, getIsEquivalentTokens } from "domain/tokens";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { applyFactor, expandDecimals, formatAmount } from "lib/numbers";
import { getCappedPositionImpactUsd } from "../fees";
import { TokenData, convertToTokenAmount, convertToUsd } from "../tokens";

export function getPositionKey(account: string, marketAddress: string, collateralAddress: string, isLong: boolean) {
  return `${account}:${marketAddress}:${collateralAddress}:${isLong}`;
}

export function parsePositionKey(positionKey: string) {
  const [account, marketAddress, collateralAddress, isLong] = positionKey.split(":");

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

  return pendingBorrowingFeesUsd.add(pendingFundingFeesUsd);
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
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, "minPrice");

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
  sizeInTokens: BigNumber;
  initialCollateralUsd: BigNumber;
  collateralToken: TokenData;
  markPrice: BigNumber;
  closingFeeUsd: BigNumber;
  marketInfo: MarketInfo;
  pendingFundingFeesUsd: BigNumber;
  pendingBorrowingFeesUsd: BigNumber;
  minCollateralUsd: BigNumber;
  isLong: boolean;
  useMaxPriceImpact?: boolean;
}) {
  const {
    sizeInUsd,
    sizeInTokens,
    initialCollateralUsd,
    marketInfo,
    collateralToken,
    // markPrice,
    closingFeeUsd,
    pendingFundingFeesUsd,
    pendingBorrowingFeesUsd,
    minCollateralUsd,
    isLong,
    useMaxPriceImpact,
  } = p;

  if (!sizeInUsd.gt(0) || !sizeInTokens.gt(0)) {
    return undefined;
  }

  const { indexToken } = marketInfo;

  const totalPendingFeesUsd = getPositionPendingFeesUsd({ pendingFundingFeesUsd, pendingBorrowingFeesUsd });

  let priceImpactDeltaUsd: BigNumber = BigNumber.from(0);

  if (useMaxPriceImpact) {
    priceImpactDeltaUsd = applyFactor(sizeInUsd, marketInfo.maxPositionImpactFactorForLiquidations).mul(-1);
  } else {
    try {
      // TODO: virtual inventory from market info after contracts migration
      priceImpactDeltaUsd = getCappedPositionImpactUsd(marketInfo, {}, sizeInUsd.mul(-1), isLong);
    } catch (e) {
      // Ignore price impact error in case of negative OI
      priceImpactDeltaUsd = BigNumber.from(0);
    }

    // Ignore positive price impact
    if (priceImpactDeltaUsd.gt(0)) {
      priceImpactDeltaUsd = BigNumber.from(0);
    }
  }

  const remainingCollateralUsd = initialCollateralUsd
    .add(priceImpactDeltaUsd)
    .sub(totalPendingFeesUsd)
    .sub(closingFeeUsd);

  let liquidationCollateralUsd = applyFactor(sizeInUsd, marketInfo.minCollateralFactor);
  if (liquidationCollateralUsd.lt(minCollateralUsd)) {
    liquidationCollateralUsd = minCollateralUsd;
  }

  if (getIsEquivalentTokens(collateralToken, indexToken)) {
    const remainingCollateralAmount = convertToTokenAmount(
      remainingCollateralUsd,
      indexToken.decimals,
      indexToken.prices.minPrice
    )!;

    if (isLong) {
      const denominator = remainingCollateralAmount.add(sizeInTokens);

      if (denominator.eq(0)) {
        return undefined;
      }

      return liquidationCollateralUsd.add(sizeInUsd).div(denominator).mul(expandDecimals(1, indexToken.decimals));
    } else {
      const denominator = remainingCollateralAmount.sub(sizeInTokens).abs();

      if (denominator.eq(0)) {
        return undefined;
      }

      return liquidationCollateralUsd.sub(sizeInUsd).abs().div(denominator).mul(expandDecimals(1, indexToken.decimals));
    }
  } else {
    if (sizeInTokens.eq(0)) {
      return undefined;
    }

    if (isLong) {
      return liquidationCollateralUsd
        .sub(remainingCollateralUsd)
        .add(sizeInUsd)
        .div(sizeInTokens)
        .mul(expandDecimals(1, indexToken.decimals));
    } else {
      return liquidationCollateralUsd
        .sub(remainingCollateralUsd)
        .sub(sizeInUsd)
        .div(sizeInTokens.mul(-1))
        .mul(expandDecimals(1, indexToken.decimals));
    }
  }
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
