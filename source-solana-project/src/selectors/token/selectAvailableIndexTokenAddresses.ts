import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectAvailableTokenOptions } from './selectAvailableTokenOptions';

export const selectAvailableIndexTokenAddresses = createAppStoreSelector(
  [selectAvailableTokenOptions],
  (options) => options.indexTokens.map((t) => t.address.toBase58())
);
