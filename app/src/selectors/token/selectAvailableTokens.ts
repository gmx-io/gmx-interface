import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectAvailableTokenOptions } from './selectAvailableTokenOptions';

export const selectAvailableTokens = createAppStoreSelector(
  [selectAvailableTokenOptions],
  (options) => options.tokens
);
