import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectTradeboxSelectedPosition } from './selectTradeboxSelectedPosition';

export const selectTradeboxHasExistingPosition = createAppStoreSelector(
  [selectTradeboxSelectedPosition],
  (selectedPosition) => !!selectedPosition
);
