import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectOrderEditorSizeDeltaUsd } from './selectOrderEditorSizeDeltaUsd';
import { selectOrderEditorTriggerPrice } from './selectOrderEditorTriggerPrice';
import { selectOrderEditorExistingPosition } from './selectOrderEditorExistingPosition';
import { selectPositionConstants } from '../position/baseSelectors';
import { selectTradeboxKeepLeverage } from '../tradebox/baseSelectors';
import { selectOrderEditorAcceptablePriceImpactBps } from './baseSelectors';
import { selectSavedAcceptablePriceImpactBuffer } from '../setting/baseSelectors';
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';
import { selectWrappedNativeToken } from '../token/selectWrappedNativeToken';
import { selectUserOrderFeeDiscountFactor } from '../referral/selectUserOrderFeeDiscountFactor';
import { getDecreasePositionAmounts } from '@/utils/tradebox/getDecreasePositionAmounts';
import { OrderType } from '@/selectors/order/types';

export const selectOrderEditorDecreaseAmounts = createAppStoreSelector(
  [
    selectOrderEditorEditingOrder,
    selectMarketsInfo,
    selectOrderEditorSizeDeltaUsd,
    selectOrderEditorTriggerPrice,
    selectOrderEditorExistingPosition,
    selectPositionConstants,
    selectTradeboxKeepLeverage,
    selectOrderEditorAcceptablePriceImpactBps,
    selectSavedAcceptablePriceImpactBuffer,
    selectUserOrderFeeDiscountFactor,
    selectWrappedNativeToken,
  ],
  (
    order,
    marketsInfoData,
    sizeDeltaUsd,
    triggerPrice,
    existingPosition,
    { minCollateralUsd, minPositionSizeUsd },
    keepLeverage,
    acceptablePriceImpactBps,
    savedAcceptablePriceImpactBuffer,
    { userOrderFeeDiscountFactor },
    wrappedNativeToken
  ) => {
    if (!order || !wrappedNativeToken) return undefined;

    const market = marketsInfoData?.[order.marketTokenAddress.toBase58()];

    if (
      !market ||
      sizeDeltaUsd === undefined ||
      minCollateralUsd === undefined ||
      minPositionSizeUsd === undefined
    ) {
      return undefined;
    }

    return getDecreasePositionAmounts({
      marketInfo: market,
      collateralToken: order.targetCollateralToken,
      isLong: order.isLong,
      position: existingPosition,
      closeSizeUsd: sizeDeltaUsd,
      keepLeverage,
      triggerPrice,
      fixedAcceptablePriceImpactBps: acceptablePriceImpactBps,
      acceptablePriceImpactBuffer: savedAcceptablePriceImpactBuffer,
      minCollateralUsd,
      minPositionSizeUsd,
      triggerOrderType: order.orderType as
        | OrderType.LimitDecrease
        | OrderType.StopLossDecrease
        | undefined,
      feeDiscountFactor: userOrderFeeDiscountFactor,
      wrappedNativeToken,
      findSwapPath: undefined,
    });
  }
);
