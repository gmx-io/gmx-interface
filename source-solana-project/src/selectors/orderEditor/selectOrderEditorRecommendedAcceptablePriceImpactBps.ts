import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';
import { selectOrderEditorIncreaseAmounts } from './selectOrderEditorIncreaseAmounts';
import { selectOrderEditorDecreaseAmounts } from './selectOrderEditorDecreaseAmounts';
import { OrderType } from '@/selectors/order/types';

export const selectOrderEditorRecommendedAcceptablePriceImpactBps =
  createAppStoreSelector(
    [
      selectOrderEditorEditingOrder,
      selectOrderEditorIncreaseAmounts,
      selectOrderEditorDecreaseAmounts,
    ],
    (order, increaseAmounts, decreaseAmounts) => {
      if (!order) return undefined;

      const isLimitIncreaseOrder = order.orderType === OrderType.LimitIncrease;

      if (isLimitIncreaseOrder && increaseAmounts?.acceptablePrice) {
        return Math.abs(increaseAmounts.acceptablePriceDeltaBps);
      }

      if (decreaseAmounts?.recommendedAcceptablePriceDeltaBps !== undefined) {
        return Math.abs(decreaseAmounts.recommendedAcceptablePriceDeltaBps);
      }

      return undefined;
    }
  );
