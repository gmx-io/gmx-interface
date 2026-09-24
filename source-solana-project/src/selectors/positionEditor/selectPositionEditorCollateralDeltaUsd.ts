import { createAppStoreSelector } from '@/zustand/useAppStore';

import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { selectPositionEditorCollateralDeltaAmount } from './selectPositionEditorCollateralDeltaAmount';
import { selectPositionEditorEditingPosition } from './selectPositionEditorEditingPosition';

export const selectPositionEditorCollateralDeltaUsd = createAppStoreSelector(
  [
    selectPositionEditorCollateralDeltaAmount,
    selectPositionEditorEditingPosition,
  ],
  (collateralDeltaAmount, position) => {
    return convertTokenAmountToUsd(
      collateralDeltaAmount,
      position?.collateralToken.decimals,
      position?.collateralToken.prices.minPrice
    );
  }
);
