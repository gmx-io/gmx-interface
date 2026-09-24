import { MarketInfo } from '@/selectors/market/types';
import { BN } from '@coral-xyz/anchor';

export function getMarketReservedUsd(marketInfo: MarketInfo, isLong: boolean) {
  if (isLong) {
    return marketInfo.reserveValueForLong ?? new BN(0);
  } else {
    return marketInfo.reserveValueForShort ?? new BN(0);
  }
}
