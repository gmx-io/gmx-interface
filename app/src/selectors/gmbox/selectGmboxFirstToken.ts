import { selectGmboxFirstTokenAddress } from '@/selectors/gmbox/baseSelectors';
import { selectGmboxAllTokensData } from '@/selectors/gmbox/selectGmboxAllTokensData';
import { getTokenData } from '@/utils/token/getTokenData';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectGmboxFirstToken = createAppStoreSelector(
  [selectGmboxAllTokensData, selectGmboxFirstTokenAddress],
  (tokensData, address) => getTokenData(tokensData, address)
);
