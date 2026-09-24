import { selectTradeboxCollateralTokenAddress } from './selectTradeboxCollateralTokenAddress';
import { createStructuredSelector } from 'reselect';

import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxToTokenAddress } from './selectTradeboxToTokenAddress';
import { selectTradeboxFromTokenAddress } from './selectTradeboxFromTokenAddress';
import { selectTradeboxMarketTokenAddress } from './selectTradeboxMarketTokenAddress';
import { selectTradeboxIndexTokenAddress } from './selectTradeboxIndexTokenAddress';
import { selectTradeboxSwapToTokenAddress } from './selectTradeboxSwapToTokenAddress';

export const selectTradeboxTokensAddresses = createStructuredSelector(
  {
    swapToTokenAddress: selectTradeboxSwapToTokenAddress,
    indexTokenAddress: selectTradeboxIndexTokenAddress,
    marketTokenAddress: selectTradeboxMarketTokenAddress,
    fromTokenAddress: selectTradeboxFromTokenAddress,
    toTokenAddress: selectTradeboxToTokenAddress,
    collateralTokenAddress: selectTradeboxCollateralTokenAddress,
  },
  createAppStoreSelector
);
