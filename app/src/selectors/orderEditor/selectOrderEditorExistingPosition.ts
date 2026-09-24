import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectPositionsInfo } from '../position/selectPositionsInfo';
import { selectOrderEditorPositionAddress } from './selectOrderEditorPositionAddress';

export const selectOrderEditorExistingPosition = createAppStoreSelector(
  [selectOrderEditorPositionAddress, selectPositionsInfo],
  (positionAddress, positionsInfo) => {
    return positionAddress
      ? positionsInfo[positionAddress.toBase58()]
      : undefined;
  }
);
