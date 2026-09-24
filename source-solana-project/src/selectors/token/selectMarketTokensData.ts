import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectBalances } from './baseSelectors';
import { selectMarketTokenPrices } from '../market/baseSelectors';
import { selectMarketTokenMetadatas } from '../market/baseSelectors';
import { TokensData } from '@/selectors/token/types';
import { BN_ZERO } from '@/config/constants';
import { translateAddress } from '@coral-xyz/anchor';

export const selectMarketTokensData = createAppStoreSelector(
  [selectMarketTokenMetadatas, selectMarketTokenPrices, selectBalances],
  (metadatas, prices, balances) => {
    const marketTokensData: TokensData = {};

    for (const key in metadatas) {
      const metadata = metadatas[key];
      const price = prices[key] ?? BN_ZERO;
      marketTokensData[key] = {
        symbol: `GM`,
        address: translateAddress(key),
        ...metadata,
        prices: {
          maxPrice: price,
          minPrice: price,
        },
        balance: balances[key],
      };
    }

    return marketTokensData;
  }
);
