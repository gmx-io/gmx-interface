import { ONE_USD } from '@/config/constants';
import { TokenData } from '@/selectors/token/types';

export function getOrderExchangeRate(
  tokenAInfo: TokenData,
  tokenBInfo: TokenData,
  inverted: boolean
) {
  if (
    !tokenAInfo ||
    !tokenAInfo.prices.minPrice ||
    !tokenBInfo ||
    !tokenBInfo.prices.maxPrice
  ) {
    return;
  }
  if (inverted) {
    return tokenAInfo.prices.minPrice
      .mul(ONE_USD)
      .div(tokenBInfo.prices.maxPrice);
  }
  return tokenBInfo.prices.maxPrice
    .mul(ONE_USD)
    .div(tokenAInfo.prices.minPrice);
}
