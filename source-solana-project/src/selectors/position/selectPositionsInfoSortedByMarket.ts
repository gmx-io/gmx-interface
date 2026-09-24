import { BN_ZERO } from '@/config/constants';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectPositionsInfo } from '../position/selectPositionsInfo';
import { selectTradeboxMarketsSortMap } from '../tradebox/selectTradeboxMarketsSortMap';

export const selectPositionsInfoSortedByMarket = createAppStoreSelector(
  [selectPositionsInfo, selectTradeboxMarketsSortMap],
  (positionsInfo, marketsSortMap) => {
    const positions = Object.values(positionsInfo || {});
    const sortedPositions = positions.sort((a, b) => {
      const aMarketIdx =
        marketsSortMap[a.marketInfo.indexTokenAddress.toBase58()];
      const bMarketIdx =
        marketsSortMap[b.marketInfo.indexTokenAddress.toBase58()];

      if (aMarketIdx === bMarketIdx) {
        return b.sizeInUsd.sub(a.sizeInUsd).gt(BN_ZERO) ? 1 : -1;
      }

      return aMarketIdx - bMarketIdx;
    });
    return sortedPositions;
  }
);
