import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectPositionsInfo } from './selectPositionsInfo';

export const selectPositionList = createAppStoreSelector(
  [selectPositionsInfo],
  (marketInfos) => Object.values(marketInfos)
);
