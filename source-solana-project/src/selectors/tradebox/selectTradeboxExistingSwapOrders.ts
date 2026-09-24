import { createAppStoreSelector } from '@/zustand/useAppStore';

import { isSwapOrderType } from '@/utils/order/isOrderType';
import { selectOrdersInfo } from '../order/selectOrdersInfo';

export const selectTradeboxExistingSwapOrders = createAppStoreSelector(
  selectOrdersInfo,
  (ordersInfo) => {
    return Object.values(ordersInfo).filter((order) =>
      isSwapOrderType(order.orderType)
    );
  }
);
