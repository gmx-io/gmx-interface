import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectGlvTokenMetadatas, selectGlvTokenPrices } from '@/selectors/glv';
import { selectBalances } from '../token/baseSelectors';
import { TokensData } from '@/selectors/token/types';
import { BN_ZERO } from '@/config/constants';
import { translateAddress } from '@coral-xyz/anchor';

export const selectGlvTokensData = createAppStoreSelector(
  [selectGlvTokenMetadatas, selectGlvTokenPrices, selectBalances],
  (metadatas, prices, balances) => {
    const glvTokensData: TokensData = {};

    for (const key in metadatas) {
      const metadata = metadatas[key];
      const price = prices[key] ?? BN_ZERO;
      glvTokensData[key] = {
        symbol: `GLV`,
        address: translateAddress(key),
        ...metadata,
        prices: {
          maxPrice: price,
          minPrice: price,
        },
        balance: balances[key],
      };
    }

    return glvTokensData;
  }
);
