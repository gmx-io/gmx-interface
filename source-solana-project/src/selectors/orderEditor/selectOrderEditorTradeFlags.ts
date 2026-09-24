import { getTradeFlagsForOrder } from '@/utils/tradebox/getTradeFlagsForOrder';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';

export const selectOrderEditorTradeFlags = createAppStoreSelector(
  [selectOrderEditorEditingOrder],
  (order) => {
    if (!order)
      throw new Error('selectOrderEditorTradeFlags: Order is not defined');
    return getTradeFlagsForOrder(order);
  }
);
