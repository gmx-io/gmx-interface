import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectAvailableTokenOptions } from './selectAvailableTokenOptions';

export const selectAvailableTokenAddresses = createAppStoreSelector(
  [selectAvailableTokenOptions],
  (options) => Object.keys(options.tokens)
);
