import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectMarketsInfo } from './selectMarketsInfo';
import { selectMarketTokensData } from '../token/selectMarketTokensData';
import { sortMarketsWithIndexToken } from '@/hooks/marketHooks/useSortedPoolsWithIndexToken';

export const selectSortedMarketInfoByIndexToken = createAppStoreSelector(
  [selectMarketsInfo, selectMarketTokensData],
  (marketsInfo, marketTokensData) => {
    const sortedMarketsWithIndexToken = sortMarketsWithIndexToken(
      marketsInfo,
      marketTokensData
    );

    return sortedMarketsWithIndexToken.marketsInfo;
  }
);
