import { TokenData, TokensData } from '@/selectors/token/types';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectBalances } from './baseSelectors';
import { selectPrices } from './baseSelectors';
import { selectTokens } from './baseSelectors';

export const selectTokensData = createAppStoreSelector(
  [selectTokens, selectPrices, selectBalances],
  (tokens, prices, balances): TokensData => {
    const TokensData: TokensData = {};

    for (const [address, token] of Object.entries(tokens)) {
      if (address in prices) {
        TokensData[address] = {
          ...token,
          prices: prices[address],
          balance: balances[address] ?? null,
        } as TokenData;
      }
    }

    return TokensData;
  }
);
