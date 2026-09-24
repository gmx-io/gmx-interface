import { MarketInfo } from '@/selectors/market/types';

export function getMarketMaxOpenInterestUsd(
  marketInfo: MarketInfo,
  isLong: boolean
) {
  return isLong
    ? marketInfo.maxOpenInterestForLong
    : marketInfo.maxOpenInterestForShort;
}
