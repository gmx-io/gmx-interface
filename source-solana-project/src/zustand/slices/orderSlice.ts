import isEqual from 'lodash/isEqual';
import { SliceCreator } from '@/zustand/types';
import { Order, Orders } from '@/selectors/order/types';

interface OrderState {
  orders: Orders;
  isOrdersLoading: boolean;

  setOrders: (orders: Record<string, Order>) => void;
  setIsOrdersLoading: (loading: boolean) => void;
}

export interface OrderSlice {
  orderState: OrderState;
}

export const createOrderSlice: SliceCreator<OrderSlice> = (set, get) => ({
  orderState: {
    orders: {},
    isOrdersLoading: true,

    setOrders: (orders) => {
      // const currentOrders = { ...get().orderState.orders };
      // for (const key in currentOrders) {
      //   if (!(key in orders)) {
      //     delete currentOrders[key];
      //   }
      // }
      // for (const key in orders) {
      //   const order = orders[key];
      //   const current = currentOrders[key];
      //   if (!isEqual(current, order)) {
      //     currentOrders[key] = order;
      //   }
      // }
      set((state) => ({
        orderState: {
          ...state.orderState,
          orders,
        },
      }));
    },

    setIsOrdersLoading: (loading) =>
      set((state) => ({
        orderState: {
          ...state.orderState,
          isOrdersLoading: loading,
        },
      })),
  },
});
