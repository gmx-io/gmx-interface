import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectAvailableTokenOptions } from './selectAvailableTokenOptions';

export const selectSortedIndexTokensWithPoolValue = createAppStoreSelector(
  [selectAvailableTokenOptions],
  (options) => options.sortedIndexTokensWithPoolValue
);
