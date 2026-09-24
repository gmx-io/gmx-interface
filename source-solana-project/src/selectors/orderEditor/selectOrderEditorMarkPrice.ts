import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectMarketsInfo } from '@/selectors/market/selectMarketsInfo';
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';
import { selectTokensData } from '@/selectors/token/selectTokensData';
import { getTokenData } from '@/utils/token/getTokenData';

export const selectOrderEditorMarkPrice = createAppStoreSelector(
  [selectOrderEditorEditingOrder, selectMarketsInfo, selectTokensData],
  (order, marketsInfo, tokensData) => {
    if (!order) return undefined;

    const market = marketsInfo[order.marketTokenAddress.toBase58()];
    const indexToken = getTokenData(
      tokensData,
      market?.indexTokenAddress.toBase58()
    );

    if (!indexToken) return undefined;

    return order.isLong
      ? indexToken.prices?.minPrice
      : indexToken.prices?.maxPrice;
  }
);
