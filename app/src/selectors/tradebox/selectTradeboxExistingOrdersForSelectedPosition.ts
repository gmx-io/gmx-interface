import { createAppStoreSelector } from '@/zustand/useAppStore';

import { PositionOrderInfo } from '@/selectors/order/types';
import { getByKey } from '@/utils/lib/object';
import { isOrderForPosition } from '@/utils/order/isOrderType';
import { selectPositionsInfo } from '../position/selectPositionsInfo';
import { selectOrdersInfo } from '../order/selectOrdersInfo';
import { selectTradeboxSelectedPositionAddress } from './selectTradeboxSelectedPositionAddress';

export const selectTradeboxExistingOrdersForSelectedPosition =
  createAppStoreSelector(
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

      return orders.filter((order) =>
        isOrderForPosition(order as PositionOrderInfo, position)
      );
    }
  );
