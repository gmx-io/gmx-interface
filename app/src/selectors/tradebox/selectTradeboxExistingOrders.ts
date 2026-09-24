import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectOrdersInfo } from '../order/selectOrdersInfo';

export const selectTradeboxExistingOrders = createAppStoreSelector(
  [selectOrdersInfo],
  (ordersInfo) => {
    return Object.values(ordersInfo || {});
  }
);
