import { MarketInfo } from '@/selectors/market/types';
import { applyFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';

export function getPositionFeeUsd(
  marketInfo: MarketInfo,
  sizeDeltaUsd: BN,
  forPositiveImpact: boolean
) {
  const factor = forPositiveImpact
    ? marketInfo.orderFeeFactorForPositiveImpact
    : marketInfo.orderFeeFactorForNegativeImpact;

  return applyFactor(sizeDeltaUsd, factor);
}
