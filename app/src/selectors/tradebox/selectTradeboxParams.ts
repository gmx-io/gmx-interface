import { createStructuredSelector } from 'reselect';

import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxTokenUsds } from './selectTradeboxTokenUsds';
import { selectTradeboxTokenAmounts } from './selectTradeboxTokenAmounts';
import { selectTradeboxTokens } from './selectTradeboxTokens';
import { selectTradeboxTokensAddresses } from './selectTradeboxTokensAddresses';

export const selectTradeboxParams = createStructuredSelector(
  {
    tokensAddress: selectTradeboxTokensAddresses,
    tokens: selectTradeboxTokens,
    amounts: selectTradeboxTokenAmounts,
    usds: selectTradeboxTokenUsds,
  },
  createAppStoreSelector
);
