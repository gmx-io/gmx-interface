import { BN_ONE, BN_ZERO } from '@/config/constants';
import { getGmw200Enabled } from '@/config/featureFlagEnable';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { expandDecimals } from '@/utils/legacy/decimals';
import { applyFactor } from '@/utils/legacy/factor';
import { getPositionFeeUsd } from '@/utils/position/getPositionFeeUsd';
import { getPositionPendingFeesUsd } from '@/utils/position/getPositionPendingFeesUsd';
import { getPositionPriceImpactUsd } from '@/utils/position/getPositionPriceImpactUsd';
import { getIsEquivalentTokens } from '@/utils/token/getIsEquivalentTokens';
import { BN } from '@coral-xyz/anchor';

export function getPositionLiquidationPrice(p: {
  sizeInUsd: BN;
  sizeInTokens: BN;
  collateralAmount: BN;
  collateralUsd: BN;
  collateralToken: TokenData;
  marketInfo: MarketInfo;
  pendingFundingFeesUsd: BN;
  pendingBorrowingFeesUsd: BN;
  minCollateralUsd: BN;
  isLong: boolean;
  useMaxPriceImpact?: boolean;
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
    useMaxPriceImpact,
  } = p;

  if (sizeInUsd.lte(BN_ZERO) || sizeInTokens.lte(BN_ZERO)) {
    return undefined;
  }

  const { indexToken } = marketInfo;

  const closingFeeUsd = getPositionFeeUsd(marketInfo, sizeInUsd, false);
  const totalPendingFeesUsd = getPositionPendingFeesUsd({
    pendingFundingFeesUsd,
    pendingBorrowingFeesUsd,
  });
  const totalFeesUsd = totalPendingFeesUsd.add(closingFeeUsd);

  const maxNegativePriceImpactUsd = applyFactor(
    sizeInUsd,
    marketInfo.maxPositionImpactFactorForLiquidations
  ).neg();

  let priceImpactDeltaUsd = BN_ZERO;

  if (useMaxPriceImpact) {
    priceImpactDeltaUsd = maxNegativePriceImpactUsd;
  } else {
    priceImpactDeltaUsd = getPositionPriceImpactUsd(
      marketInfo,
      sizeInUsd.neg(),
      isLong,
      {
        fallbackToZero: true,
      }
    );

    if (priceImpactDeltaUsd.lt(maxNegativePriceImpactUsd)) {
      priceImpactDeltaUsd = maxNegativePriceImpactUsd;
    }

    // Ignore positive price impact
    if (priceImpactDeltaUsd.gt(BN_ZERO)) {
      priceImpactDeltaUsd = BN_ZERO;
    }
  }

  let liquidationCollateralUsd = applyFactor(
    sizeInUsd,
    getGmw200Enabled()
      ? marketInfo.minCollateralFactorForLiquidation
      : marketInfo.minCollateralFactor
  );
  if (liquidationCollateralUsd.lt(minCollateralUsd)) {
    liquidationCollateralUsd = minCollateralUsd;
  }

  let liquidationPrice: BN;

  if (getIsEquivalentTokens(collateralToken, indexToken)) {
    if (isLong) {
      const denominator = sizeInTokens.add(collateralAmount);

      if (denominator.isZero()) {
        return undefined;
      }

      liquidationPrice = sizeInUsd
        .add(liquidationCollateralUsd)
        .sub(priceImpactDeltaUsd)
        .add(totalFeesUsd)
        .div(denominator)
        .mul(expandDecimals(BN_ONE, indexToken.decimals));
    } else {
      const denominator = sizeInTokens.sub(collateralAmount);

      if (denominator.isZero()) {
        return undefined;
      }

      liquidationPrice = sizeInUsd
        .sub(liquidationCollateralUsd)
        .add(priceImpactDeltaUsd)
        .sub(totalFeesUsd)
        .div(denominator)
        .mul(expandDecimals(BN_ONE, indexToken.decimals));
    }
  } else {
    if (sizeInTokens.isZero()) {
      return undefined;
    }

    const remainingCollateralUsd = collateralUsd
      .add(priceImpactDeltaUsd)
      .sub(totalPendingFeesUsd)
      .sub(closingFeeUsd);

    if (isLong) {
      liquidationPrice = liquidationCollateralUsd
        .sub(remainingCollateralUsd)
        .add(sizeInUsd)
        .div(sizeInTokens)
        .mul(expandDecimals(BN_ONE, indexToken.decimals));
    } else {
      liquidationPrice = liquidationCollateralUsd
        .sub(remainingCollateralUsd)
        .sub(sizeInUsd)
        .div(sizeInTokens.neg())
        .mul(expandDecimals(BN_ONE, indexToken.decimals));
    }
  }

  if (liquidationPrice.lte(BN_ZERO)) {
    return undefined;
  }

  return liquidationPrice;
}
