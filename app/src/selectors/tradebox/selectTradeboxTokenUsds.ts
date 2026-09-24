import { createStructuredSelector } from 'reselect';

import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxFromTokenUsd } from './selectTradeboxFromTokenUsd';
import { selectTradeboxToTokenUsd } from './selectTradeboxToTokenUsd';

export const selectTradeboxTokenUsds = createStructuredSelector(
  {
    fromTokenUsd: selectTradeboxFromTokenUsd,
    toTokenUsd: selectTradeboxToTokenUsd,
  },
  createAppStoreSelector
);
