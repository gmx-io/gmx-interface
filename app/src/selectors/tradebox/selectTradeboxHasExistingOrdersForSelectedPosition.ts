import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxExistingOrdersForSelectedPosition } from './selectTradeboxExistingOrdersForSelectedPosition';

export const selectTradeboxHasExistingOrdersForSelectedPosition =
  createAppStoreSelector(
    selectTradeboxExistingOrdersForSelectedPosition,
    (existingOrders) => existingOrders.length > 0
  );
