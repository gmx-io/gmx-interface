import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { getMarketOpenInterestInToken } from '@/utils/market/getMarketOpenInterestInToken';
import { getMarketOpenInterestUsd } from '@/utils/market/getMarketOpenInterestUsd';
import { getMarketPriceForPnl } from '@/utils/market/getMarketPriceForPnl';

export function getMarketPnl(
  marketInfo: MarketInfo,
  isLong: boolean,
  forMaxPoolValue: boolean
) {
  const maximize = !forMaxPoolValue;
  const openInterestUsd = getMarketOpenInterestUsd(marketInfo, isLong);
  const openInterestInTokens = getMarketOpenInterestInToken(marketInfo, isLong);

  if (openInterestUsd.isZero() || openInterestInTokens.isZero()) {
    return BN_ZERO;
  }

  const price = getMarketPriceForPnl(
    marketInfo.indexToken.prices,
    isLong,
    maximize
  );

  const openInterestValue = convertTokenAmountToUsd(
    openInterestInTokens,
    marketInfo.indexToken.decimals,
    price
  );
  const pnl = isLong
    ? openInterestValue.sub(openInterestUsd)
    : openInterestUsd.sub(openInterestValue);

  return pnl;
}
