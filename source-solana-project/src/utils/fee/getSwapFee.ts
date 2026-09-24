import { MarketInfo } from '@/selectors/market/types';
import { applyFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';

export function getSwapFee(
  marketInfo: MarketInfo,
  swapAmount: BN,
  forPositiveImpact: boolean
): BN {
  const factor = forPositiveImpact
    ? marketInfo.swapFeeFactorForPositiveImpact
    : marketInfo.swapFeeFactorForNegativeImpact;

  return applyFactor(swapAmount, factor);
}
