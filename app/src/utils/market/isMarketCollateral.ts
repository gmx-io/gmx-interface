import { MarketInfo } from '@/selectors/market/types';
import { getTokenPoolType } from '@/utils/market/getTokenPoolType';

export function isMarketCollateral(
  marketInfo: MarketInfo,
  tokenAddress: string
) {
  return getTokenPoolType(marketInfo, tokenAddress) !== undefined;
}
