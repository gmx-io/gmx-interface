import { SwapOrderInfo } from '@/selectors/order/types';

import { PositionOrderInfo } from '@/selectors/order/types';
import {
  isLimitOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
} from '@/utils/order/isOrderType';
import { sortPositionOrders } from '@/utils/order/sortPositionOrders';
import { sortSwapOrders } from '@/utils/order/sortSwapOrders';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectOrdersInfo } from './selectOrdersInfo';
import { selectAvailableTokenOptions } from '../token/selectAvailableTokenOptions';

export const selectOrdersList = createAppStoreSelector(
  [selectOrdersInfo, selectAvailableTokenOptions],
  (
    ordersInfo,
    { sortedIndexTokensWithPoolValue, sortedLongAndShortTokens }
  ) => {
    const { swapOrders, positionOrders } = Object.values(
      ordersInfo || {}
    ).reduce(
      (acc, order) => {
        if (
          isLimitOrderType(order.orderType) ||
          isTriggerDecreaseOrderType(order.orderType)
        ) {
          if (isSwapOrderType(order.orderType)) {
            acc.swapOrders.push(order as SwapOrderInfo);
          } else {
            acc.positionOrders.push(order as PositionOrderInfo);
          }
        }
        return acc;
      },
      {
        swapOrders: [] as SwapOrderInfo[],
        positionOrders: [] as PositionOrderInfo[],
      }
    );

    return [
      ...sortPositionOrders(positionOrders, sortedIndexTokensWithPoolValue),
      ...sortSwapOrders(swapOrders, sortedLongAndShortTokens),
    ];
  }
);
