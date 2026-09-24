import { OrderErrors } from '@/selectors/order/types';

import { createAppStoreSelectorFactory } from '@/zustand/useAppStore';

import { createAppStoreSelector } from '@/zustand/useAppStore';
import { makeSelectOrderErrorByOrderAddress } from './makeSelectOrderErrorByOrderAddress';
import { makeSelectOrdersByPositionAddress } from './makeSelectOrdersByPositionAddress';
import { PositionOrderInfo } from '@/selectors/order/types';
import { sortPositionOrders } from '@/utils/order/sortPositionOrders';

export const makeSelectOrdersWithErrorsByPositionAddress =
  createAppStoreSelectorFactory<
    Array<{ order: PositionOrderInfo; orderErrors: OrderErrors }>,
    [string | undefined]
  >((positionAddress) =>
    createAppStoreSelector([(rootState) => rootState], (rootState) => {
      const selectPositionOrders =
        makeSelectOrdersByPositionAddress(positionAddress);
      const positionOrders = selectPositionOrders(rootState);
      sortPositionOrders(positionOrders);

      return positionOrders.map((order) => {
        const selectOrderErrorByOrderAddress =
          makeSelectOrderErrorByOrderAddress(order.orderAddress.toBase58());
        const orderErrors = selectOrderErrorByOrderAddress(rootState);
        return { order, orderErrors };
      });
    })
  );
