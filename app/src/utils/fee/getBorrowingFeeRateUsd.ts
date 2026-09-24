import { MarketInfo } from '@/selectors/market/types';
import { getBorrowingFactorPerPeriod } from '@/utils/fee/getBorrowingFactorPerPeriod';
import { applyFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';

export function getBorrowingFeeRateUsd(
  marketInfo: MarketInfo,
  isLong: boolean,
  sizeInUsd: BN,
  periodInSeconds: BN
) {
  const factor = getBorrowingFactorPerPeriod(
    marketInfo,
    isLong,
    periodInSeconds
  );

  return applyFactor(sizeInUsd, factor);
}
