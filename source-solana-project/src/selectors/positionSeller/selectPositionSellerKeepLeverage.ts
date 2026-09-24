import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectPositionSellerKeepLeverageRaw } from './baseSelectors';
import { selectPositionSellerClosingPosition } from './selectPositionSellerClosingPosition';
import { selectPositionSellerLeverageDisabledByCollateral } from './selectPositionSellerLeverageDisabledByCollateral';

export const selectPositionSellerKeepLeverage = createAppStoreSelector(
  [
    selectPositionSellerClosingPosition,
    selectPositionSellerKeepLeverageRaw,
    selectPositionSellerLeverageDisabledByCollateral,
  ],
  (position, keepLeverageRaw, disabledByCollateral) => {
    if (!position) return false;
    if (!keepLeverageRaw) return false;
    return !disabledByCollateral;
  }
);
