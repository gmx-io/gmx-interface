import { createSelector } from "../utils";
import { selectPositionsInfoData } from "./globalSelectors";
import { selectTradeboxMarketsSortMap } from "./tradeboxSelectors";

export const selectPositionsInfoDataSortedByMarket = createSelector((q) => {
  const positionsInfoData = q(selectPositionsInfoData);
  const marketsSortMap = q(selectTradeboxMarketsSortMap);

  const positions = Object.values(positionsInfoData || {});
  const sortedPositions = positions.sort((a, b) => {
    const aMarketIdx = marketsSortMap[a.marketInfo.indexTokenAddress];
    const bMarketIdx = marketsSortMap[b.marketInfo.indexTokenAddress];

    if (aMarketIdx === bMarketIdx) {
      return b.sizeInUsd - a.sizeInUsd > 0n ? 1 : -1;
    }

    return aMarketIdx - bMarketIdx;
  });
  return sortedPositions;
});
