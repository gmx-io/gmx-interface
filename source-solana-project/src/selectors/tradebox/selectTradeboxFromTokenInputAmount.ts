import { createAppStoreSelector } from '@/zustand/useAppStore';

import { parseAmount } from '@/utils/legacy/parse';
import { selectTradeboxFromTokenInputValue } from './baseSelectors';
import { selectTradeboxFromToken } from './selectTradeboxFromToken';

export const selectTradeboxFromTokenInputAmount = createAppStoreSelector(
  [selectTradeboxFromTokenInputValue, selectTradeboxFromToken],
  (fromTokenInputValue, fromToken) =>
    parseAmount(fromTokenInputValue, fromToken)
);
