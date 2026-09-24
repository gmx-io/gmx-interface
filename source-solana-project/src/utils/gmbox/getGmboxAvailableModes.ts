import { Mode, Operation } from '@/selectors/gmbox/types';
import { Market } from '@/selectors/market/types';

export function getGmboxAvailableModes(
  operation: Operation,
  market: Pick<Market, 'isSingle'> | undefined
) {
  if (market && market.isSingle) {
    return [Mode.Single];
  }

  if (operation === Operation.Deposit) {
    return [Mode.Single, Mode.Pair];
  }

  return [Mode.Pair];
}
