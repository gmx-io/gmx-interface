import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectAvailableTokenOptions } from './selectAvailableTokenOptions';

export const selectSortedAllMarkets = createAppStoreSelector(
  [selectAvailableTokenOptions],
  (options) => options.sortedAllMarkets
);
