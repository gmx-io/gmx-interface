import { PositionOrderInfo } from '@/selectors/order/types';
import { getByKey } from '@/utils/lib/object';
import { isOrderForPosition } from '@/utils/order/isOrderType';

import { isLimitIncreaseOrderType } from '@/utils/order/isOrderType';
import { selectPositionsInfo } from '../position/selectPositionsInfo';
import { selectOrdersInfo } from '../order/selectOrdersInfo';
import { selectTradeboxSelectedPositionAddress } from '../tradebox/selectTradeboxSelectedPositionAddress';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectTradeboxExistingLimitOrders = createAppStoreSelector(
  [
    selectTradeboxSelectedPositionAddress,
    selectOrdersInfo,
    selectPositionsInfo,
  ],
  (positionAddress, ordersInfo, positionsInfo) => {
    if (!positionAddress) {
      return [];
    }

    const orders = Object.values(ordersInfo || {});
    const position = getByKey(positionsInfo, positionAddress);

    return orders
      .filter((order) =>
        isOrderForPosition(order as PositionOrderInfo, position)
      )
      .filter((order) => isLimitIncreaseOrderType(order.orderType));
  }
);
