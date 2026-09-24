import { createAppStoreSelector } from '@/zustand/useAppStore';

import { getMarketMarkPrice } from '@/utils/market/getMarketMarkPrice';
import { selectPositionSellerClosingPosition } from './selectPositionSellerClosingPosition';

export const selectPositionSellerMarkPrice = createAppStoreSelector(
  [selectPositionSellerClosingPosition],
  (position) => {
    return position
      ? getMarketMarkPrice({
          prices: position.indexToken.prices,
          isLong: position.isLong,
          isIncrease: false,
        })
      : undefined;
  }
);
