import { Mode, Operation } from '@/selectors/gmbox/types';
import { MarketInfo } from '@/selectors/market/types';
import { GlvInfo } from '@/selectors/glv/types';

export function getGmboxAvailableSwapModes(
  operation: Operation,
  market: GlvInfo | MarketInfo | undefined
): Mode[] {
  if ((market && market.isSingle) || operation === Operation.Shift) {
    return [Mode.Single];
  }

  if (operation === Operation.Deposit) {
    return [Mode.Single, Mode.Pair];
  }

  return [Mode.Pair];
}
