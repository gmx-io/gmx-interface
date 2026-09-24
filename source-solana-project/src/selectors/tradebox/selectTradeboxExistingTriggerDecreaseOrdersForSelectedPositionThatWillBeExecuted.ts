import { getTriggerThresholdType } from '@/utils/order/getTriggerThresholdType';
import { isTriggerDecreaseOrderType } from '@/utils/order/isOrderType';
import { selectTradeboxSelectedPositionAddress } from './selectTradeboxSelectedPositionAddress';
import { selectOrdersInfo } from '../order/selectOrdersInfo';
import { selectTradeboxMarkPrice } from './selectTradeboxMarkPrice';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';

export const selectTradeboxExistingTriggerDecreaseOrdersForSelectedPositionThatWillBeExecuted =
  createAppStoreSelector(
    [
      selectTradeboxSelectedPositionAddress,
      selectOrdersInfo,
      selectTradeboxMarkPrice,
      selectTradeboxTradeFlags,
    ],
    (selectedPositionAddress, ordersInfo, markPrice, { isSwap }) => {
      if (!selectedPositionAddress || !markPrice || isSwap) {
        return [];
      }

      return Object.values(ordersInfo)
        .filter((order) => isTriggerDecreaseOrderType(order.orderType))
        .filter((order) => {
          const isMatchingPosition = isSameTokenAddress(
            order.orderRelatedPositionAddress,
            selectedPositionAddress
          );

          if (!isMatchingPosition) return false;

          const triggerAboveThreshold = getTriggerThresholdType(
            order.orderType,
            order.isLong
          );

          return triggerAboveThreshold
            ? markPrice.gte(order.triggerPrice)
            : markPrice.lte(order.triggerPrice);
        });
    }
  );
