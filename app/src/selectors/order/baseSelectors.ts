import { Order } from '@/selectors/order/types';
import { RootState } from '@/zustand/useAppStore';
import { isOrderForDisplay } from '@/utils/order/isOrderType';

export const selectOrders = (state: RootState) => state.orderState.orders;
export const selectIsOrdersLoading = (state: RootState) =>
  state.orderState.isOrdersLoading;
export const selectSetOrders = (state: RootState) => state.orderState.setOrders;
export const selectSetIsOrdersLoading = (state: RootState) =>
  state.orderState.setIsOrdersLoading;

export const selectOrdersArray = (state: RootState): Order[] =>
  Object.values(state.orderState.orders);
export const selectOrderKeys = (state: RootState): string[] =>
  Object.keys(state.orderState.orders);
export const selectOrdersCountForDisplay = (state: RootState): number =>
  Object.values(state.orderState.orders).filter((order) =>
    isOrderForDisplay(order.orderType)
  ).length;
export const selectHasOrders = (state: RootState): boolean =>
  selectOrdersCountForDisplay(state) > 0;
