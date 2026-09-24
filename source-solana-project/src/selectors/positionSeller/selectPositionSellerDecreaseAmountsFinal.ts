import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectPositionSellerKeepLeverage } from './selectPositionSellerKeepLeverage';
import { selectPositionSellerDecreaseAmounts } from './selectPositionSellerDecreaseAmounts';
import { selectPositionSellerDecreaseAmountsWithKeepLeverage } from './selectPositionSellerDecreaseAmountsWithKeepLeverage';

export const selectPositionSellerDecreaseAmountsFinal = createAppStoreSelector(
  [
    selectPositionSellerKeepLeverage,
    selectPositionSellerDecreaseAmounts,
    selectPositionSellerDecreaseAmountsWithKeepLeverage,
  ],
  (isKeepLeverage, decreaseAmountsRaw, decreaseAmountsWithKeepLeverage) => {
    return isKeepLeverage
      ? decreaseAmountsWithKeepLeverage
      : decreaseAmountsRaw;
  }
);
