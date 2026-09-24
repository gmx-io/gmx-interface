import { createStructuredSelector } from 'reselect';

import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxFromTokenInputAmount } from './selectTradeboxFromTokenInputAmount';
import { selectTradeboxToTokenInputAmount } from './selectTradeboxToTokenInputAmount';

export const selectTradeboxTokenAmounts = createStructuredSelector(
  {
    fromTokenAmount: selectTradeboxFromTokenInputAmount,
    toTokenAmount: selectTradeboxToTokenInputAmount,
  },
  createAppStoreSelector
);
