import { BN_TWO } from '@/config/constants';
import { TokenPrices } from '@/selectors/token/types';

export function getMarketMidPrice(prices: TokenPrices) {
  return prices.minPrice.add(prices.maxPrice).div(BN_TWO);
}
