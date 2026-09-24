import { OrderOption } from '@/selectors/order/types';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectPositionSellerOrderOption } from './baseSelectors';

export const selectPositionSellerIsTrigger = createAppStoreSelector(
  [selectPositionSellerOrderOption],
  (orderOption) => {
    return orderOption === OrderOption.Trigger;
  }
);
