import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectGtBankTokenAddresses } from './selectGtBankTokenAddresses';
import { selectTokensData } from '../token/selectTokensData';
import { TokensData } from '@/selectors/token/types';

export const selectGtBankTokensData = createAppStoreSelector(
  [selectGtBankTokenAddresses, selectTokensData],
  (tokenAddresses, tokensData): TokensData =>
    tokenAddresses.reduce((acc, address) => {
      if (address in tokensData) {
        acc[address] = tokensData[address];
      }
      return acc;
    }, {} as TokensData)
);
