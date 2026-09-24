import { BN_ZERO, ONE_USD } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { getMarketReservedUsd } from '@/utils/market/getMarketReservedUsd';
import { getPoolUsdWithoutPnl } from '@/utils/market/getPoolUsdWithoutPnl';

export function getMarketAvailableLiquidityUsdForCollateral(
  marketInfo: MarketInfo,
  isLong: boolean
) {
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, 'minPrice');

  if (marketInfo.isSpotOnly) {
    return poolUsd;
  }

  const reservedUsd = getMarketReservedUsd(marketInfo, isLong);
  const maxReserveFactor = marketInfo.reserveFactor;

  if (maxReserveFactor.isZero()) {
    return BN_ZERO;
  }

  const minPoolUsd = reservedUsd?.mul(ONE_USD).div(maxReserveFactor);
  const liquidity = poolUsd.sub(minPoolUsd ?? '0');

  return liquidity;
}
