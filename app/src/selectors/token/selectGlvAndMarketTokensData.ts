import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectGlvTokensData } from './selectGlvTokensData';
import { selectMarketTokensData } from './selectMarketTokensData';
import { TokensData } from './types';

export const selectGlvAndMarketTokensData = createAppStoreSelector(
  [selectGlvTokensData, selectMarketTokensData],
  (glvTokensData, marketTokensData): TokensData => {
    return {
      ...glvTokensData,
      ...marketTokensData,
    };
  }
);
