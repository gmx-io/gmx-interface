import { MarketInfo } from '@/selectors/market/types';
import { getTokenPoolType } from '@/utils/market/getTokenPoolType';

export function getMarketOppositeCollateral(
  marketInfo: MarketInfo,
  tokenAddress: string
) {
  const poolType = getTokenPoolType(marketInfo, tokenAddress);

  if (poolType === 'long') {
    return marketInfo.shortToken;
  }

  if (poolType === 'short') {
    return marketInfo.longToken;
  }

  return undefined;
}
