import { BN_ZERO } from '@/config/constants';
import { SwapStats } from '@/selectors/trade/types';

export function getSwapVolumeFromSwapStats(swapSteps?: SwapStats[]) {
  if (!swapSteps) return BN_ZERO;

  return swapSteps.reduce((acc, curr) => {
    return acc.add(curr.usdIn);
  }, BN_ZERO);
}
