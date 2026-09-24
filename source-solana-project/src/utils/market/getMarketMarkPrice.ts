import { TokenPrices } from '@/selectors/token/types';

export function getMarketMarkPrice(p: {
  prices: TokenPrices;
  isIncrease: boolean;
  isLong: boolean;
}) {
  const { prices, isIncrease, isLong } = p;
  const shouldUseMaxPrice = getShouldUseMaxPrice(isIncrease, isLong);
  return shouldUseMaxPrice ? prices.maxPrice : prices.minPrice;
}

function getShouldUseMaxPrice(isIncrease: boolean, isLong: boolean) {
  return isIncrease ? isLong : !isLong;
}
