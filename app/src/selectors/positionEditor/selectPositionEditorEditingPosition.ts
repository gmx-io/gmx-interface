import { createAppStoreSelector } from '@/zustand/useAppStore';

import { getByKey } from '@/utils/lib/object';
import { selectPositionsInfo } from '../position/selectPositionsInfo';
import { selectPositionEditorEditingPositionAddress } from './baseSelectors';

export const selectPositionEditorEditingPosition = createAppStoreSelector(
  [selectPositionsInfo, selectPositionEditorEditingPositionAddress],
  (positionsInfo, positionAddress) => {
    if (!positionAddress) {
      return undefined;
    }
    return getByKey(positionsInfo, positionAddress);
  }
);
