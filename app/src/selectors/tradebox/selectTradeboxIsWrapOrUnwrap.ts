import { createAppStoreSelector } from '@/zustand/useAppStore';

import { getIsUnwrap } from '@/utils/token/getIsUnwrap';
import { getIsWrap } from '@/utils/token/getIsWrap';
import { selectTradeboxToToken } from './selectTradeboxToToken';
import { selectTradeboxFromToken } from './selectTradeboxFromToken';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';

export const selectTradeboxIsWrapOrUnwrap = createAppStoreSelector(
  selectTradeboxTradeFlags,
  selectTradeboxFromToken,
  selectTradeboxToToken,
  ({ isSwap }, fromToken, toToken): boolean => {
    if (!isSwap || !fromToken || !toToken) {
      return false;
    }
    const isWrapOrUnwrap =
      getIsWrap(fromToken, toToken) || getIsUnwrap(fromToken, toToken);
    return isWrapOrUnwrap ?? false;
  }
);
