import { MarketInfo } from '@/selectors/market/types';
import { getFundingFactorPerPeriod } from '@/utils/fee/getFundingFactorPerPeriod';
import { applyFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';

export function getFundingFeeRateUsd(
  marketInfo: MarketInfo,
  isLong: boolean,
  sizeInUsd: BN,
  periodInSeconds: BN
) {
  const factor = getFundingFactorPerPeriod(marketInfo, isLong, periodInSeconds);

  return applyFactor(sizeInUsd, factor);
}
