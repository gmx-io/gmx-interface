import { createAppStoreSelector } from '@/zustand/useAppStore';
import { isMarketDecreaseOrderType } from '@/utils/order/isOrderType';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';
import { selectOrdersInfo } from '../order/selectOrdersInfo';
import { selectPositionsInfo } from './selectPositionsInfo';

export const selectPositionsInfoWithMarketDecreaseOrder =
  createAppStoreSelector(
    [selectOrdersInfo, selectPositionsInfo],
    (ordersInfo, positionsInfo) => {
      return Object.values(positionsInfo).filter((position) => {
        return Object.values(ordersInfo)
          .filter((order) => isMarketDecreaseOrderType(order.orderType))
          .some((order) =>
            isSameTokenAddress(
              order.orderRelatedPositionAddress,
              position.address
            )
          );
      });
    }
  );
