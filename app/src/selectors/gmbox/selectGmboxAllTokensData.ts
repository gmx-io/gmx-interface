import { selectGlvAndMarketTokensData } from '@/selectors/token/selectGlvAndMarketTokensData';
import { selectTokensData } from '@/selectors/token/selectTokensData';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectGmboxAllTokensData = createAppStoreSelector(
  [selectTokensData, selectGlvAndMarketTokensData],
  (tokensData, glvAndMarketTokensData) => ({
    ...tokensData,
    ...glvAndMarketTokensData,
  })
);
