import { MarketInfo } from '@/selectors/market/types';
import { BN } from '@coral-xyz/anchor';

export function getMarketOpenInterestUsd(
  marketInfo: MarketInfo,
  isLong: boolean
): BN {
  return isLong
    ? marketInfo.openInterestForLongLongTokenAmount.add(
        marketInfo.openInterestForLongShortTokenAmount
      )
    : marketInfo.openInterestForShortLongTokenAmount.add(
        marketInfo.openInterestForShortShortTokenAmount
      );
}
