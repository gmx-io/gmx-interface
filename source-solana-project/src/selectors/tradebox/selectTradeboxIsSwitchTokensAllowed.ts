import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectAvailableSwapTokenAddresses } from '../token/selectAvailableSwapTokenAddresses';
import { selectSortedAllMarkets } from '../token/selectSortedAllMarkets';
import { selectTradeboxFromToken } from './selectTradeboxFromToken';
import { selectTradeboxFromTokenAddress } from './selectTradeboxFromTokenAddress';
import { selectTradeboxIndexTokenAddress } from './selectTradeboxIndexTokenAddress';
import { selectTradeboxMarketTokenAddress } from './selectTradeboxMarketTokenAddress';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';

export const selectTradeboxIsSwitchTokensAllowed = createAppStoreSelector(
  [
    selectTradeboxTradeFlags,
    selectTradeboxFromToken,
    selectTradeboxFromTokenAddress,
    selectTradeboxIndexTokenAddress,
    selectAvailableSwapTokenAddresses,
    selectSortedAllMarkets,
    selectTradeboxMarketTokenAddress,
  ],
  (
    { isSwap },
    fromToken,
    fromTokenAddress,
    indexTokenAddress,
    availableSwapTokenAddresses,
    sortedAllMarkets,
    currentMarketTokenAddress
  ) => {
    if (isSwap) {
      return true;
    }

    if (fromToken?.isStable) {
      return false;
    }

    const allowedPayTokensSet = new Set(availableSwapTokenAddresses);
    const allowedIndexTokens = new Set(
      sortedAllMarkets.map((m) => m.indexToken.address.toBase58())
    );

    const marketsMap = Object.fromEntries(
      sortedAllMarkets.map((m) => [m.marketTokenAddress.toBase58(), m])
    );

    const isCurrentPayTokenValid =
      fromTokenAddress && allowedPayTokensSet.has(fromTokenAddress);
    const isCurrentIndexTokenValid =
      indexTokenAddress && allowedIndexTokens.has(indexTokenAddress);
    const isCurrentMarketTokenValid =
      currentMarketTokenAddress &&
      marketsMap[currentMarketTokenAddress]?.marketTokenAddress.toBase58() ===
        currentMarketTokenAddress;

    if (
      isCurrentPayTokenValid &&
      isCurrentIndexTokenValid &&
      isCurrentMarketTokenValid
    ) {
      return true;
    }

    const isFallbackPayTokenValid = allowedPayTokensSet.size > 0;
    const isFallbackIndexTokenValid = allowedIndexTokens.size > 0;

    return isFallbackPayTokenValid && isFallbackIndexTokenValid;
  }
);
