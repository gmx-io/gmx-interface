import { createAppStoreSelector } from '@/zustand/useAppStore';
import { isMarketIncreaseOrderType } from '@/utils/order/isOrderType';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';
import { selectOrdersInfo } from '../order/selectOrdersInfo';
import { selectPositionsInfo } from './selectPositionsInfo';

export const selectPositionsInfoWithMarketIncreaseOrder =
  createAppStoreSelector(
    [selectOrdersInfo, selectPositionsInfo],
    (ordersInfo, positionsInfo) => {
      return Object.values(positionsInfo).filter((position) => {
        return Object.values(ordersInfo)
          .filter((order) => isMarketIncreaseOrderType(order.orderType))
          .some((order) =>
            isSameTokenAddress(
              order.orderRelatedPositionAddress,
              position.address
            )
          );
      });
    }
  );
