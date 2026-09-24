import { createAppStoreSelector } from '@/zustand/useAppStore';

import { isLimitSwapOrderType } from '@/utils/order/isOrderType';
import { selectOrdersInfo } from '../order/selectOrdersInfo';

export const selectTradeboxExistingLimitSwapOrders = createAppStoreSelector(
  selectOrdersInfo,
  (ordersInfo) => {
    return Object.values(ordersInfo).filter((order) =>
      isLimitSwapOrderType(order.orderType)
    );
  }
);
