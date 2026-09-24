import { isTriggerDecreaseOrderType } from '@/utils/order/isOrderType';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectOrdersInfo } from '../order/selectOrdersInfo';
import { selectTradeboxSelectedPositionAddress } from './selectTradeboxSelectedPositionAddress';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';

export const selectTradeboxExistingTriggerDecreaseOrdersForSelectedPosition =
  createAppStoreSelector(
    selectTradeboxSelectedPositionAddress,
    selectOrdersInfo,
    (selectedPositionAddress, ordersInfo) => {
      return Object.values(ordersInfo)
        .filter((order) => isTriggerDecreaseOrderType(order.orderType))
        .filter((order) => {
          return isSameTokenAddress(
            order.orderRelatedPositionAddress,
            selectedPositionAddress
          );
        });
    }
  );
