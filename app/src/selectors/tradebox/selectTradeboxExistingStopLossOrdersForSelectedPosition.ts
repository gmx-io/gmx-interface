import { createAppStoreSelector } from '@/zustand/useAppStore';

import { isStopLossOrderType } from '@/utils/order/isOrderType';
import { selectOrdersInfo } from '../order/selectOrdersInfo';
import { selectTradeboxSelectedPositionAddress } from './selectTradeboxSelectedPositionAddress';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';

export const selectTradeboxExistingStopLossOrdersForSelectedPosition =
  createAppStoreSelector(
    selectTradeboxSelectedPositionAddress,
    selectOrdersInfo,
    (selectedPositionAddress, ordersInfo) => {
      return Object.values(ordersInfo)
        .filter((order) => isStopLossOrderType(order.orderType))
        .find((order) => {
          return isSameTokenAddress(
            order.orderRelatedPositionAddress,
            selectedPositionAddress
          );
        });
    }
  );
