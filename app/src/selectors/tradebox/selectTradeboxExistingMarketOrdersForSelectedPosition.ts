import { isSwapOrderType } from '@/utils/order/isOrderType';
import { selectOrdersInfo } from '../order/selectOrdersInfo';
import { selectTradeboxSelectedPositionAddress } from './selectTradeboxSelectedPositionAddress';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';

export const selectTradeboxExistingMarketOrdersForSelectedPosition =
  createAppStoreSelector(
    selectTradeboxSelectedPositionAddress,
    selectOrdersInfo,
    (selectedPositionAddress, ordersInfo) => {
      if (!selectedPositionAddress) {
        return undefined;
      }

      return Object.values(ordersInfo)
        .filter((order) => !isSwapOrderType(order.orderType))
        .filter((order) => {
          if (isSwapOrderType(order.orderType)) {
            return false;
          }
          return isSameTokenAddress(
            order.orderRelatedPositionAddress,
            selectedPositionAddress
          );
        });
    }
  );
