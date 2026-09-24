import { createAppStoreSelector } from '@/zustand/useAppStore';

import { getSwapEstimator } from '@/utils/tradebox/getSwapEstimator';
import { selectMarketsInfo } from '../market/selectMarketsInfo';

export const selectSwapEstimator = createAppStoreSelector(
  [selectMarketsInfo],
  (marketsInfo) => {
    if (!marketsInfo) return undefined;
    return getSwapEstimator(marketsInfo);
  }
);
