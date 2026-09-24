import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { getSwapMarketsGraph } from '@/utils/tradebox/getSwapMarketsGraph';

export const selectSwapGraph = createAppStoreSelector(
  [selectMarketsInfo],
  (marketsInfo) => {
    if (!marketsInfo) return undefined;
    return getSwapMarketsGraph(Object.values(marketsInfo));
  }
);
