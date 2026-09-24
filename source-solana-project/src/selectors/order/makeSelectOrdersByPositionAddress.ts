import { isSwapOrderType } from '@/utils/order/isOrderType';

import { PositionOrderInfo } from '@/selectors/order/types';
import { getByKey } from '@/utils/lib/object';
import { isOrderForPosition } from '@/utils/order/isOrderType';
import { selectOrdersInfo } from './selectOrdersInfo';
import {
  createAppStoreSelector,
  createAppStoreSelectorFactory,
} from '@/zustand/useAppStore';
import { selectPositionsInfo } from '../position/selectPositionsInfo';

export const makeSelectOrdersByPositionAddress = createAppStoreSelectorFactory<
  PositionOrderInfo[],
  [string | undefined]
>((positionAddress) =>
  createAppStoreSelector(
    [selectOrdersInfo, selectPositionsInfo],
    (ordersInfo, positionsInfo) => {
      if (!positionAddress) {
        return [];
      }

      const orders = Object.values(ordersInfo || {});
      return orders
        .filter((order) => !isSwapOrderType(order.orderType))
        .filter((order) =>
          isOrderForPosition(
            order as PositionOrderInfo,
            getByKey(positionsInfo, positionAddress)
          )
        ) as PositionOrderInfo[];
    }
  )
);
