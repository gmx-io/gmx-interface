import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { getGmMaxPoolAmount } from '@/utils/gm/getGmMaxPoolAmount';

export function getGmDepositCapacityAmount(
  marketInfo: MarketInfo,
  isLong: boolean
) {
  const poolAmount = isLong
    ? marketInfo.longPoolAmount
    : marketInfo.shortPoolAmount;
  const maxPoolAmount = getGmMaxPoolAmount(marketInfo, isLong);
  const capacityAmount = maxPoolAmount.sub(poolAmount);

  return capacityAmount.gt(BN_ZERO) ? capacityAmount : BN_ZERO;
}
