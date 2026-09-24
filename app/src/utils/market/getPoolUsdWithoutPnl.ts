import { MarketInfo } from '@/selectors/market/types';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { getMarketMidPrice } from '@/utils/market/getMarketMidPrice';
import { BN } from '@coral-xyz/anchor';

export function getPoolUsdWithoutPnl(
  marketInfo: MarketInfo,
  isLong: boolean,
  priceType: 'minPrice' | 'maxPrice' | 'midPrice'
) {
  const poolAmount = isLong
    ? marketInfo.primaryLongTokenAmount
    : marketInfo.primaryShortTokenAmount;
  const token = isLong ? marketInfo.longToken : marketInfo.shortToken;

  let price: BN;

  if (priceType === 'minPrice') {
    price = token.prices?.minPrice;
  } else if (priceType === 'maxPrice') {
    price = token.prices?.maxPrice;
  } else {
    price = getMarketMidPrice(token.prices);
  }

  return convertTokenAmountToUsd(poolAmount, token.decimals, price);
}
