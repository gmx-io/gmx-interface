import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectAvailableTokenOptions } from './selectAvailableTokenOptions';

export const selectAvailableSwapTokenAddresses = createAppStoreSelector(
  [selectAvailableTokenOptions],
  (options) => options.swapTokens.map((t) => t.address.toBase58())
);
