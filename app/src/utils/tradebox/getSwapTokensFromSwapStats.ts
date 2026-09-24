import { TokenData } from '@/selectors/token/types';
import { SwapStats } from '@/selectors/trade/types';
import { getByKey } from '@/utils/lib/object';

export function getSwapTokensFromSwapStats(
  swapSteps: SwapStats[],
  tokensData: Record<string, TokenData>
): TokenData[] {
  return swapSteps
    .map((step) => getByKey(tokensData, step.tokenOutAddress))
    .filter((token) => token) as TokenData[];
}
