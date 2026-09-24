import { createAppStoreSelector } from '@/zustand/useAppStore';

import { parseValue } from '@/utils/legacy/parse';
import { selectPositionEditorCollateralInputValue } from './baseSelectors';
import { selectPositionEditorEditingPosition } from './selectPositionEditorEditingPosition';

export const selectPositionEditorCollateralDeltaAmount = createAppStoreSelector(
  [
    selectPositionEditorCollateralInputValue,
    selectPositionEditorEditingPosition,
  ],
  (collateralInputValue, position) => {
    const collateralDeltaAmount = parseValue(
      collateralInputValue || '0',
      position?.collateralToken.decimals || 0
    );
    return collateralDeltaAmount;
  }
);
