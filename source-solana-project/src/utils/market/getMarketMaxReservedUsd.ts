import { MarketInfo } from '@/selectors/market/types';
import { applyFactor } from '@/utils/legacy/factor';
import { getPoolUsdWithoutPnl } from '@/utils/market/getPoolUsdWithoutPnl';
import { BN } from '@coral-xyz/anchor';

export function getMarketMaxReservedUsd(
  marketInfo: MarketInfo,
  isLong: boolean
) {
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, 'minPrice');
  const reserveFactor = BN.min(
    marketInfo.openInterestReserveFactor,
    marketInfo.reserveFactor
  );

  return applyFactor(poolUsd, reserveFactor);
}
