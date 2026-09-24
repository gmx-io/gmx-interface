import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectOrderEditorFromToken } from './selectOrderEditorFromToken';
import { selectOrderEditorToToken } from './selectOrderEditorToToken';
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';
import { getTokensRatioByPrices } from '@/utils/token/getTokensRatioByPrices';

export const selectOrderEditorMarkRatio = createAppStoreSelector(
  [
    selectOrderEditorEditingOrder,
    selectOrderEditorFromToken,
    selectOrderEditorToToken,
  ],
  (order, fromToken, toToken) => {
    if (!order || !fromToken || !toToken) return undefined;

    return getTokensRatioByPrices({
      fromToken,
      toToken,
      fromPrice: fromToken.prices.minPrice,
      toPrice: toToken.prices.minPrice,
    });
  }
);
