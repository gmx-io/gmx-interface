import { createAppStoreSelector } from '@/zustand/useAppStore';
import { isMarketIncreaseOrderType } from '@/utils/order/isOrderType';
import { selectOrdersInfo } from './selectOrdersInfo';
import { OrdersInfo } from './types';

export const selectOrdersInfoForMarketIncrease = createAppStoreSelector(
  [selectOrdersInfo],
  (ordersInfo): OrdersInfo => {
    const filteredOrders: OrdersInfo = {};

    for (const key in ordersInfo) {
      const order = ordersInfo[key];
      if (isMarketIncreaseOrderType(order.orderType)) {
        filteredOrders[key] = order;
      }
    }

    return filteredOrders;
  }
);
