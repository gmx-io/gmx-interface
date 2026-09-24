import { getTokenData } from '@/utils/token/getTokenData';
import { selectGmboxAllTokensData } from './selectGmboxAllTokensData';
import { selectGmboxSecondTokenAddress } from './baseSelectors';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectGmboxSecondToken = createAppStoreSelector(
  [selectGmboxAllTokensData, selectGmboxSecondTokenAddress],
  (tokensData, address) => getTokenData(tokensData, address)
);
