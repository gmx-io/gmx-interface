import { PositionInfo } from '@/selectors/position/types';
import { applyFactor } from '@/utils/legacy/factor';
import { getMarketOpenInterestUsd } from '@/utils/market/getMarketOpenInterestUsd';
import { BN } from '@coral-xyz/anchor';

export function getPositionMinCollateralFactor(position: PositionInfo) {
  const marketInfo = position.marketInfo;
  const isLong = position.isLong;
  const openInterest = getMarketOpenInterestUsd(marketInfo, isLong);

  const minCollateralFactorMultiplier = isLong
    ? marketInfo.minCollateralFactorForOpenInterestMultiplierForLong
    : marketInfo.minCollateralFactorForOpenInterestMultiplierForShort;

  const minCollateralFactorForOpenInterest = applyFactor(
    openInterest,
    minCollateralFactorMultiplier
  );
  const minCollateralFactorForMarket = marketInfo.minCollateralFactor;

  const minCollateralFactor = BN.max(
    minCollateralFactorForMarket,
    minCollateralFactorForOpenInterest
  );

  return minCollateralFactor;
}
