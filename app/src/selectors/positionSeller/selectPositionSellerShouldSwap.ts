import { createAppStoreSelector } from '@/zustand/useAppStore';

import { getIsEquivalentTokens } from '@/utils/token/getIsEquivalentTokens';
import { selectPositionSellerClosingPosition } from './selectPositionSellerClosingPosition';
import { selectPositionSellerReceiveToken } from './selectPositionSellerReceiveToken';

export const selectPositionSellerShouldSwap = createAppStoreSelector(
  [selectPositionSellerClosingPosition, selectPositionSellerReceiveToken],
  (position, receiveToken) => {
    return (
      position &&
      receiveToken &&
      !getIsEquivalentTokens(position.collateralToken, receiveToken)
    );
  }
);
