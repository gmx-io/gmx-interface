import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectAvailableTokenOptions } from './selectAvailableTokenOptions';

export const selectSwapTokens = createAppStoreSelector(
  [selectAvailableTokenOptions],
  (options) => options.swapTokens
);
