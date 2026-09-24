import { createAppStoreSelector } from '@/zustand/useAppStore';

import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { selectTradeboxToToken } from './selectTradeboxToToken';
import { selectTradeboxToTokenInputAmount } from './selectTradeboxToTokenInputAmount';

export const selectTradeboxToTokenUsd = createAppStoreSelector(
  selectTradeboxToTokenInputAmount,
  selectTradeboxToToken,
  (toTokenInputAmount, toToken) =>
    toToken && toTokenInputAmount
      ? convertTokenAmountToUsd(
          toTokenInputAmount,
          toToken.decimals,
          toToken.prices.maxPrice
        )
      : undefined
);
