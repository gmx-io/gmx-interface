import { ONE_USD } from '@/config/constants';
import { DEFAULT_MAX_LEVERAGE } from '@/config/factors';
import { applyFactor, divToFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';

export function getTradeMaxLeverage(
  baseFactor: BN,
  oiFactor: BN,
  openInterest: BN
): BN {
  if (baseFactor.isZero() && (oiFactor.isZero() || openInterest.isZero())) {
    return DEFAULT_MAX_LEVERAGE;
  }

  const baseMaxLeverage = baseFactor.isZero()
    ? DEFAULT_MAX_LEVERAGE
    : divToFactor(ONE_USD, baseFactor);
  const oiMaxLeverage =
    oiFactor.isZero() || openInterest.isZero()
      ? DEFAULT_MAX_LEVERAGE
      : divToFactor(ONE_USD, applyFactor(openInterest, oiFactor));

  return baseMaxLeverage.lt(oiMaxLeverage) ? baseMaxLeverage : oiMaxLeverage;
}
