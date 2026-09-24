import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { getGmMaxPoolUsd } from '@/utils/gm/getGmMaxPoolUsd';
import { getPoolUsdWithoutPnl } from '@/utils/market/getPoolUsdWithoutPnl';

export function getGmDepositCapacityUsd(
  marketInfo: MarketInfo,
  isLong: boolean
) {
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, 'midPrice');
  const maxPoolUsd = getGmMaxPoolUsd(marketInfo, isLong);

  const capacityUsd = maxPoolUsd.sub(poolUsd);

  return capacityUsd.gt(BN_ZERO) ? capacityUsd : BN_ZERO;
}
