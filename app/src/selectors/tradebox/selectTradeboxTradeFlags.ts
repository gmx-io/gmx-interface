import { getTradeFlags } from '@/utils/tradebox/getTradeFlags';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import {
  selectTradeboxTradeMode,
  selectTradeboxTradeType,
} from './baseSelectors';

export const selectTradeboxTradeFlags = createAppStoreSelector(
  [selectTradeboxTradeType, selectTradeboxTradeMode],
  (tradeType, tradeMode) => getTradeFlags(tradeType, tradeMode)
);
