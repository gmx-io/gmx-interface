import { createAppStoreSelector } from '@/zustand/useAppStore';

import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { selectTradeboxFromToken } from './selectTradeboxFromToken';
import { selectTradeboxFromTokenInputAmount } from './selectTradeboxFromTokenInputAmount';

export const selectTradeboxFromTokenUsd = createAppStoreSelector(
  selectTradeboxFromTokenInputAmount,
  selectTradeboxFromToken,
  (fromTokenInputAmount, fromToken) =>
    fromToken && fromTokenInputAmount
      ? convertTokenAmountToUsd(
          fromTokenInputAmount,
          fromToken.decimals,
          fromToken.prices.minPrice
        )
      : undefined
);
