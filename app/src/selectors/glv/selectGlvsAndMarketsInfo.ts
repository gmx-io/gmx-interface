import { selectGlvsInfo } from '@/selectors/glv/selectGlvsInfo';
import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { GlvAndGmMarketsInfo } from '@/selectors/glv/types';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectGlvsAndMarketsInfo = createAppStoreSelector(
  [selectGlvsInfo, selectMarketsInfo],
  (glvsInfo, marketsInfo): GlvAndGmMarketsInfo => {
    return {
      ...glvsInfo,
      ...marketsInfo,
    };
  }
);
