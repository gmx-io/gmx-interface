import { TokenPrices } from '@/selectors/token/types';

export function getMarketPriceForPnl(
  prices: TokenPrices,
  isLong: boolean,
  maximize: boolean
) {
  // for long positions, pick the larger price to maximize pnl
  // for short positions, pick the smaller price to maximize pnl
  if (isLong) {
    return maximize ? prices.maxPrice : prices.minPrice;
  }

  return maximize ? prices.minPrice : prices.maxPrice;
}
