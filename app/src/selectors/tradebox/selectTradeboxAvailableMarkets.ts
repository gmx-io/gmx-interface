import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectTradeboxTokensAddresses } from './selectTradeboxTokensAddresses';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';

export const selectTradeboxAvailableMarkets = createAppStoreSelector(
  [selectMarketsInfo, selectTradeboxTokensAddresses],
  (marketsInfo, { indexTokenAddress }) => {
    if (!indexTokenAddress) return [];
    return Object.values(marketsInfo)
      .filter((market) => !market.isDisabled && !market.isSpotOnly)
      .filter((market) =>
        isSameTokenAddress(market.indexTokenAddress, indexTokenAddress)
      );
  }
);
