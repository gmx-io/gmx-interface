import { BN_ONE } from '@/config/constants';
import { TokenPrices } from '@/selectors/token/types';
import { expandDecimals } from '@/utils/legacy/decimals';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import mapValues from 'lodash/mapValues';

import { selectThrottledPrices, selectTokens } from './baseSelectors';

export const selectThrottledUnitPrices = createAppStoreSelector(
  [selectTokens, selectThrottledPrices],
  (tokens, prices) =>
    mapValues(
      prices,
      (price, key) =>
        ({
          minPrice: price.minPrice.div(
            expandDecimals(BN_ONE, tokens[key].decimals)
          ),
          maxPrice: price.maxPrice.div(
            expandDecimals(BN_ONE, tokens[key].decimals)
          ),
        }) satisfies TokenPrices
    )
);
