import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectOrderEditorFromToken } from './selectOrderEditorFromToken';
import { selectOrderEditorMarkRatio } from './selectOrderEditorMarkRatio';

export const selectOrderEditorIsRatioInverted = createAppStoreSelector(
  [selectOrderEditorMarkRatio, selectOrderEditorFromToken],
  (markRatio, fromToken) => {
    if (!markRatio || !fromToken) return undefined;
    return isSameTokenAddress(
      markRatio.largestToken.address,
      fromToken.address
    );
  }
);
