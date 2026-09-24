import { getPositionMinCollateralFactor } from '@/utils/position/getPositionMinCollateralFactor';
import { willPositionCollateralBeSufficientForPosition } from '@/utils/position/willPositionCollateralBeSufficientForPosition';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectPositionSellerClosingPosition } from './selectPositionSellerClosingPosition';
import { selectPositionSellerDecreaseAmountsWithKeepLeverage } from './selectPositionSellerDecreaseAmountsWithKeepLeverage';

export const selectPositionSellerLeverageDisabledByCollateral =
  createAppStoreSelector(
    [
      selectPositionSellerClosingPosition,
      selectPositionSellerDecreaseAmountsWithKeepLeverage,
    ],
    (position, decreaseAmountsWithKeepLeverage) => {
      if (!position || !decreaseAmountsWithKeepLeverage) return false;

      if (decreaseAmountsWithKeepLeverage.sizeDeltaUsd.gte(position.sizeInUsd))
        return false;

      const minCollateralFactor = getPositionMinCollateralFactor(position);

      if (minCollateralFactor === undefined) return false;

      return !willPositionCollateralBeSufficientForPosition(
        position,
        decreaseAmountsWithKeepLeverage.collateralDeltaAmount,
        decreaseAmountsWithKeepLeverage.realizedPnl,
        minCollateralFactor,
        decreaseAmountsWithKeepLeverage.sizeDeltaUsd.neg()
      );
    }
  );
