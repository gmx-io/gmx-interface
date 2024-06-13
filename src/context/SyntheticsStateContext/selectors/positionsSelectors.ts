import { createSelector } from "../utils";
import { selectPositionsInfoData } from "./globalSelectors";
import { selectTradeboxMarketsOrderMap } from "./tradeboxSelectors";

export const selectPositionsInfoDataSortedByMarket = createSelector((q) => {
  const positionsInfoData = q(selectPositionsInfoData);
  const marketsOrder = q(selectTradeboxMarketsOrderMap);

  const positions = Object.values(positionsInfoData || {});
  const sortedPositions = positions.sort((a, b) => {
    const aMarketIdx = marketsOrder[a.marketInfo.indexTokenAddress];
    const bMarketIdx = marketsOrder[b.marketInfo.indexTokenAddress];

    if (aMarketIdx === bMarketIdx) {
      return b.sizeInUsd - a.sizeInUsd > 0n ? 1 : -1;
    }

    return aMarketIdx - bMarketIdx;
  });
  return sortedPositions;
});
