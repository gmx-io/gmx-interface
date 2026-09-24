import { createAppStoreSelectorFactory } from '@/zustand/useAppStore';

import { getGmw402Enabled } from '@/config/featureFlagEnable';
import { getPriceDecimals } from '@/utils/legacy/common';
import { getMarketPriceInputDecimalsFromPrices } from '@/utils/priceInput/getMarketPriceInputDecimals';
import { getByKey } from '@/utils/lib/object';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTokensData } from '../token/selectTokensData';

export const makeSelectMarketPriceDecimals = createAppStoreSelectorFactory<
  number | undefined,
  [string | undefined]
>((tokenAddress) =>
  createAppStoreSelector([selectTokensData], (tokensData) => {
    const token = tokenAddress ? getByKey(tokensData, tokenAddress) : undefined;

    if (!token?.prices.minPrice) {
      return undefined;
    }

    if (getGmw402Enabled()) {
      return getMarketPriceInputDecimalsFromPrices(token.prices, tokenAddress);
    }

    return getPriceDecimals(token.prices.minPrice);
  })
);
