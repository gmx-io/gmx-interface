import { getPositionMinCollateralFactor } from '@/utils/position/getPositionMinCollateralFactor';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectPositionEditorEditingPosition } from './selectPositionEditorEditingPosition';

export const selectPositionEditorMinCollateralFactor = createAppStoreSelector(
  [selectPositionEditorEditingPosition],
  (position) => {
    if (!position) {
      return undefined;
    }
    return getPositionMinCollateralFactor(position);
  }
);
