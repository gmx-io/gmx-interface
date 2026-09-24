import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectAvailableTokenOptions } from './selectAvailableTokenOptions';

export const selectSortedLongAndShortTokens = createAppStoreSelector(
  [selectAvailableTokenOptions],
  (options) => options.sortedLongAndShortTokens
);
