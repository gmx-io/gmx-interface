import { createAppStoreSelector } from '@/zustand/useAppStore';
import { parseAmount } from '@/utils/legacy/parse';
import { selectTradeboxToTokenInputValue } from './baseSelectors';
import { selectTradeboxToToken } from './selectTradeboxToToken';

export const selectTradeboxToTokenInputAmount = createAppStoreSelector(
  [selectTradeboxToTokenInputValue, selectTradeboxToToken],
  (toTokenInputValue, toToken) => parseAmount(toTokenInputValue, toToken)
);
