import { MarketInfo } from '@/selectors/market/types';
import { BN } from '@coral-xyz/anchor';

export function getBorrowingFactorPerPeriod(
  marketInfo: MarketInfo,
  isLong: boolean,
  periodInSeconds: BN
) {
  const factorPerSecond = isLong
    ? marketInfo.borrowingFactorPerSecondForLong
    : marketInfo.borrowingFactorPerSecondForShort;

  return factorPerSecond ? factorPerSecond.mul(periodInSeconds) : new BN(0);
}
