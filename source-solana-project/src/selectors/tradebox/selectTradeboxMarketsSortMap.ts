import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectAvailableTokenOptions } from '../token/selectAvailableTokenOptions';

export const selectTradeboxMarketsSortMap = createAppStoreSelector(
  selectAvailableTokenOptions,
  ({ sortedAllMarkets }) => {
    return sortedAllMarkets.reduce(
      (acc: Record<string, number>, market, idx) => {
        const marketKey = market.indexTokenAddress.toBase58();
        acc[marketKey] = idx;
        return acc;
      },
      {} as Record<string, number>
    );
  }
);
