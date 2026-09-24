import { createAppStoreSelector } from '@/zustand/useAppStore';

import { isLimitOrderType } from '@/utils/order/isOrderType';
import { selectOrdersInfo } from '../order/selectOrdersInfo';

export const selectTradeboxExistingLimitOrders = createAppStoreSelector(
  selectOrdersInfo,
  (ordersInfo) => {
    return Object.values(ordersInfo).filter((order) =>
      isLimitOrderType(order.orderType)
    );
  }
);
