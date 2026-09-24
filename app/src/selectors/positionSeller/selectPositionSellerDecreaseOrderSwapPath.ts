import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectPositionSellerSwapAmounts } from './selectPositionSellerSwapAmounts';

export const selectPositionSellerDecreaseOrderSwapPath = createAppStoreSelector(
  [selectPositionSellerSwapAmounts],
  (swapAmounts) => {
    return swapAmounts?.swapPathStats?.swapPath;
  }
);
