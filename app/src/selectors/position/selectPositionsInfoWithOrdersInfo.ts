import { PositionOrderInfo } from '@/selectors/order/types';
import { getByKey } from '@/utils/lib/object';
import { isOrderForPosition, isSwapOrderType } from '@/utils/order/isOrderType';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import values from 'lodash/values';

import { selectOrdersInfo } from '../order/selectOrdersInfo';
import { selectPositionsInfo } from './selectPositionsInfo';
import { selectPositionsInfoSortedByMarket } from './selectPositionsInfoSortedByMarket';

export const selectPositionsInfoWithOrdersInfo = createAppStoreSelector(
  [selectOrdersInfo, selectPositionsInfo, selectPositionsInfoSortedByMarket],
  (ordersInfo, positionsInfo, sortedPositions) => {
    const orders = values(ordersInfo);
    return sortedPositions.filter((position) => {
      return orders.some(
        (order) =>
          !isSwapOrderType(order.orderType) &&
          isOrderForPosition(
            order as PositionOrderInfo,
            getByKey(positionsInfo, position.address.toBase58())
          )
      );
    });
  }
);
