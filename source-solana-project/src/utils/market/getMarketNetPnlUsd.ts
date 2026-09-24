import { MarketInfo } from '@/selectors/market/types';
import { getMarketCappedPoolPnl } from '@/utils/market/getMarketCappedPoolPnl';
import { getMarketPnl } from '@/utils/market/getMarketPnlUsd';
import { getPoolUsdWithoutPnl } from '@/utils/market/getPoolUsdWithoutPnl';

export function getMarketNetPnl(marketInfo: MarketInfo, maximize: boolean) {
  const longPnl = getMarketPnl(marketInfo, true, maximize);
  const shortPnl = getMarketPnl(marketInfo, false, maximize);

  const cappedLongPnl = getMarketCappedPoolPnl({
    marketInfo,
    poolUsd: getPoolUsdWithoutPnl(
      marketInfo,
      true,
      maximize ? 'maxPrice' : 'minPrice'
    ),
    poolPnl: longPnl,
    isLong: true,
  });

  const cappedShortPnl = getMarketCappedPoolPnl({
    marketInfo,
    poolUsd: getPoolUsdWithoutPnl(
      marketInfo,
      false,
      maximize ? 'maxPrice' : 'minPrice'
    ),
    poolPnl: shortPnl,
    isLong: false,
  });

  return cappedLongPnl.add(cappedShortPnl);
}
