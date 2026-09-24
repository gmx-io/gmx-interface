import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectPositionEditorEditingPosition } from './selectPositionEditorEditingPosition';

export const selectPositionEditorCollateralToken = createAppStoreSelector(
  [selectPositionEditorEditingPosition],
  (position) => {
    return position?.collateralToken;
  }
);
