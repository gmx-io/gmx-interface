import { selectGmboxSelectedMarketTokenOrGLvTokenAddress } from '@/selectors/gmbox/baseSelectors';
import { selectGlvAndMarketTokensData } from '@/selectors/token/selectGlvAndMarketTokensData';
import { getTokenData } from '@/utils/token/getTokenData';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectGmboxMarketOrGLvToken = createAppStoreSelector(
  [
    selectGlvAndMarketTokensData,
    selectGmboxSelectedMarketTokenOrGLvTokenAddress,
  ],
  (tokensData, address) => getTokenData(tokensData, address)
);
