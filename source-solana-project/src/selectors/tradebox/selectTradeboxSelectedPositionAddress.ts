import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectTradeboxSelectedPosition } from './selectTradeboxSelectedPosition';

export const selectTradeboxSelectedPositionAddress = createAppStoreSelector(
  [selectTradeboxSelectedPosition],
  (selectedPosition) => selectedPosition?.marketTokenAddress.toBase58()
);
