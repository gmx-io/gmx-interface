import { getTokenData } from '@/utils/token/getTokenData';
import { selectTokensData } from '../token/selectTokensData';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';

export const selectOrderEditorFromToken = createAppStoreSelector(
  [selectOrderEditorEditingOrder, selectTokensData],
  (order, tokensData) => {
    if (!order) return undefined;
    return getTokenData(tokensData, order.initialCollateralTokenAddress);
  }
);
