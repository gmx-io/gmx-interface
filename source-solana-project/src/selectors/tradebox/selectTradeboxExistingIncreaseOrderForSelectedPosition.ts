import { createAppStoreSelector } from '@/zustand/useAppStore';

import { isIncreaseOrderType } from '@/utils/order/isOrderType';
import { selectOrdersInfo } from '../order/selectOrdersInfo';
import { selectTradeboxSelectedPositionAddress } from './selectTradeboxSelectedPositionAddress';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';

// Find the first increase order for the selected position
export const selectTradeboxExistingIncreaseOrderForSelectedPosition =
  createAppStoreSelector(
    selectTradeboxSelectedPositionAddress,
    selectOrdersInfo,
    (selectedPositionAddress, ordersInfo) => {
      return Object.values(ordersInfo)
        .filter((order) => isIncreaseOrderType(order.orderType))
        .find((order) => {
          return isSameTokenAddress(
            order.orderRelatedPositionAddress,
            selectedPositionAddress
          );
        });
    }
  );
