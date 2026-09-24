import { TradeType } from '@/selectors/trade/types';

import { TradeMode } from '@/selectors/trade/types';
import { selectTradeboxTradeType } from './baseSelectors';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectTradeboxAvailableTradeModes = createAppStoreSelector(
  [selectTradeboxTradeType],
  (tradeType) =>
    ({
      [TradeType.Long]: [
        TradeMode.Market,
        TradeMode.Limit, 
        // TradeMode.Trigger
      ],
      [TradeType.Short]: [
        TradeMode.Market,
        TradeMode.Limit,
        // TradeMode.Trigger
      ],
      [TradeType.Swap]: [
        TradeMode.Market,
        TradeMode.Limit
      ],
    })[tradeType]
);
