import { createAppStoreSelector } from '@/zustand/useAppStore';

import { BN } from '@coral-xyz/anchor';
import { selectTradeboxToToken } from './selectTradeboxToToken';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';
import { getMarketMarkPrice } from '@/utils/market/getMarketMarkPrice';

export const selectTradeboxMarkPrice = createAppStoreSelector(
  selectTradeboxTradeFlags,
  selectTradeboxToToken,
  (tradeFlags, toToken): BN | undefined => {
    const { isSwap, isLong, isIncrease } = tradeFlags;

    if (!toToken) {
      return undefined;
    }

    if (isSwap) {
      return toToken.prices.minPrice;
    }

    return getMarketMarkPrice({ prices: toToken.prices, isIncrease, isLong });
  }
);
