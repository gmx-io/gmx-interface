import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectAvailableTokenOptions } from './selectAvailableTokenOptions';

export const selectIndexTokens = createAppStoreSelector(
  [selectAvailableTokenOptions],
  (options) => options.indexTokens
);
