import { createAppStoreSelector } from '@/zustand/useAppStore';

import { getIsEquivalentTokens } from '@/utils/token/getIsEquivalentTokens';
import { selectTradeboxSelectedPosition } from './selectTradeboxSelectedPosition';
import { selectTradeboxReceiveToken } from './selectTradeboxReceiveToken';

export const selectTradeboxShouldSwap = createAppStoreSelector(
  [selectTradeboxSelectedPosition, selectTradeboxReceiveToken],
  (position, receiveToken) => {
    return (
      position &&
      receiveToken &&
      !getIsEquivalentTokens(position.collateralToken, receiveToken)
    );
  }
);
