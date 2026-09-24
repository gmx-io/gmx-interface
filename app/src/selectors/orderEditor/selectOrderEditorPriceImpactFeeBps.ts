import { getFeeItem } from '@/utils/fee/getFeeItem';
import { isIncreaseOrderType } from '@/utils/order/isOrderType';
import { getAcceptablePriceInfo } from '@/utils/tradebox/getAcceptablePriceInfo';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';
import { selectOrderEditorSizeDeltaUsd } from './selectOrderEditorSizeDeltaUsd';
import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectTokensData } from '../token/selectTokensData';
import { getTokenData } from '@/utils/token/getTokenData';

export const selectOrderEditorPriceImpactFeeBps = createAppStoreSelector(
  [
    selectOrderEditorEditingOrder,
    selectOrderEditorSizeDeltaUsd,
    selectMarketsInfo,
    selectTokensData,
  ],
  (order, sizeDeltaUsd, marketsInfoData, tokensData) => {
    if (!order) return undefined;

    const market = marketsInfoData?.[order.marketTokenAddress.toBase58()];
    const indexToken = getTokenData(tokensData, market?.indexTokenAddress);
    const markPrice = order.isLong
      ? indexToken?.prices?.minPrice
      : indexToken?.prices?.maxPrice;

    const priceImpactFeeBps =
      market &&
      getFeeItem(
        getAcceptablePriceInfo({
          indexPrice: markPrice,
          isIncrease: isIncreaseOrderType(order.orderType),
          isLong: order.isLong,
          marketInfo: market,
          sizeDeltaUsd: sizeDeltaUsd,
        }).priceImpactDeltaUsd,
        sizeDeltaUsd
      )?.bps;

    return priceImpactFeeBps;
  }
);
