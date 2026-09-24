import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectOrdersList } from '../order/selectOrdersList';
import { selectOrderEditorEditingOrderAddress } from './baseSelectors';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';

export const selectOrderEditorEditingOrder = createAppStoreSelector(
  [selectOrderEditorEditingOrderAddress, selectOrdersList],
  (editingOrderAddress, orders) => {
    if (!editingOrderAddress) return undefined;
    return orders.find((order) =>
      isSameTokenAddress(order.orderAddress, editingOrderAddress)
    );
  }
);
