import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectOrderEditorAcceptablePriceImpactBps } from './baseSelectors';
import { selectOrderEditorTriggerPrice } from './selectOrderEditorTriggerPrice';
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';
import { applySlippageToPrice } from '@/utils/tradebox/applySlippageToPrice';
import { isIncreaseOrderType } from '@/utils/order/isOrderType';

export const selectOrderEditorAcceptablePrice = createAppStoreSelector(
  [
    selectOrderEditorEditingOrder,
    selectOrderEditorTriggerPrice,
    selectOrderEditorAcceptablePriceImpactBps,
  ],
  (order, triggerPrice, acceptablePriceImpactBps) => {
    if (!order || !triggerPrice) return undefined;

    return applySlippageToPrice(
      acceptablePriceImpactBps ?? 0,
      triggerPrice,
      isIncreaseOrderType(order.orderType),
      order.isLong
    );
  }
);
