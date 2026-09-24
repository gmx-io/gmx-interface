import { TokenPrices } from '@/selectors/token/types';
import { getByKey } from '@/utils/lib/object';
import { MarketMetaForRequest } from '@/zustand/types';

export function getMarketPrices(
  prices: Record<string, TokenPrices>,
  market: MarketMetaForRequest
) {
  const indexTokenPrice = getByKey(prices, market.indexToken);
  const longTokenPrice = getByKey(prices, market.longToken);
  const shortTokenPrice = getByKey(prices, market.shortToken);
  return indexTokenPrice && longTokenPrice && shortTokenPrice
    ? {
        indexTokenPrice: {
          min: indexTokenPrice.minPrice,
          max: indexTokenPrice.maxPrice,
        },
        longTokenPrice: {
          min: longTokenPrice.minPrice,
          max: longTokenPrice.maxPrice,
        },
        shortTokenPrice: {
          min: shortTokenPrice.minPrice,
          max: shortTokenPrice.maxPrice,
        },
      }
    : undefined;
}
