import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { convertUsdToTokenAmount } from '@/utils/legacy/convert';
import { getMarketOpenInterestUsd } from '@/utils/market/getMarketOpenInterestUsd';
import { BN } from '@coral-xyz/anchor';

export function getMarketOpenInterestInToken(
  marketInfo: MarketInfo,
  isLong: boolean
): BN {
  const openInterestUsd = getMarketOpenInterestUsd(marketInfo, isLong);
  const token = isLong ? marketInfo.longToken : marketInfo.shortToken;

  return (
    convertUsdToTokenAmount(
      openInterestUsd,
      token.decimals,
      token.prices.maxPrice
    ) ?? BN_ZERO
  );
}
