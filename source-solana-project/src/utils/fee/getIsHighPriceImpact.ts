import { BN_ZERO } from '@/config/constants';
import { HIGH_PRICE_IMPACT_BPS } from '@/config/factors';
import { FeeItem } from '@/selectors/fee/types';
import { getTotalFeeItem } from '@/utils/fee/getTotalFeeItem';

export function getIsHighPriceImpact(
  positionPriceImpact?: FeeItem,
  swapPriceImpact?: FeeItem
) {
  const totalPriceImpact = getTotalFeeItem([
    positionPriceImpact,
    swapPriceImpact,
  ]);
  return (
    totalPriceImpact.deltaUsd.lt(BN_ZERO) &&
    Math.abs(totalPriceImpact.bps) >= HIGH_PRICE_IMPACT_BPS
  );
}
