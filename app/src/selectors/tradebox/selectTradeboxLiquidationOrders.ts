import { createAppStoreSelector } from '@/zustand/useAppStore';

import { isLiquidationOrderType } from '@/utils/order/isOrderType';
import { selectOrdersInfo } from '../order/selectOrdersInfo';

export const selectTradeboxLiquidationOrders = createAppStoreSelector(
  selectOrdersInfo,
  (ordersInfo) => {
    return Object.values(ordersInfo).filter((order) =>
      isLiquidationOrderType(order.orderType)
    );
  }
);
