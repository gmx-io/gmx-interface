import { selectTradeboxCollateralToken } from './selectTradeboxCollateralToken';

import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxToToken } from './selectTradeboxToToken';
import { selectTradeboxFromToken } from './selectTradeboxFromToken';
import { selectTradeboxIndexToken } from './selectTradeboxIndexToken';
import { selectTradeboxSwapToToken } from './selectTradeboxSwapToToken';
import { createStructuredSelector } from 'reselect';
import { selectTradeboxMarketToken } from './selectTradeboxMarketToken';

export const selectTradeboxTokens = createStructuredSelector(
  {
    swapToToken: selectTradeboxSwapToToken,
    indexToken: selectTradeboxIndexToken,
    marketToken: selectTradeboxMarketToken,
    fromToken: selectTradeboxFromToken,
    toToken: selectTradeboxToToken,
    collateralToken: selectTradeboxCollateralToken,
  },
  createAppStoreSelector
);
