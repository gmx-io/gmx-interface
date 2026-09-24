import { ONE_USD } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { applyFactor, divToFactor } from '@/utils/legacy/factor';
import { getMarketOpenInterestUsd } from '@/utils/market/getMarketOpenInterestUsd';
import { BN } from '@coral-xyz/anchor';

export function getIsMaxLeverageExceeded(
  nextLeverage: BN,
  marketInfo: MarketInfo,
  isLong: boolean,
  sizeDeltaUsd: BN
): boolean {
  const openInterest = getMarketOpenInterestUsd(marketInfo, isLong);
  const minCollateralFactorMultiplier = isLong
    ? marketInfo.minCollateralFactorForOpenInterestMultiplierForLong
    : marketInfo.minCollateralFactorForOpenInterestMultiplierForShort;

  const minCollateralFactorForOpenInterest = applyFactor(
    openInterest.add(sizeDeltaUsd),
    minCollateralFactorMultiplier
  );
  const minCollateralFactorForMarket = marketInfo.minCollateralFactor;

  const minCollateralFactor = BN.max(
    minCollateralFactorForOpenInterest,
    minCollateralFactorForMarket
  );

  const maxLeverage = divToFactor(ONE_USD, minCollateralFactor);

  if (nextLeverage.gt(maxLeverage)) {
    return true;
  }

  return false;
}
