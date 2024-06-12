import { createSelector } from "../utils";
import { selectPositionsInfoData } from "./globalSelectors";
import { selectTradeboxMarketsOrder } from "./tradeboxSelectors";
import { bigintToNumber } from "lib/numbers";

export const selectPositionsInfoDataSortedByMarket = createSelector((q) => {
  const positionsInfoData = q(selectPositionsInfoData);
  const marketsOrder = q(selectTradeboxMarketsOrder);

  const positions = Object.values(positionsInfoData || {});

  const sortedPositions = positions.sort((a, b) => {
    const bMarketIdx = marketsOrder[a.indexToken.symbol];
    const aMarketIdx = marketsOrder[b.indexToken.symbol];

    if (aMarketIdx === bMarketIdx) {
      return bigintToNumber(a.sizeInUsd - b.sizeInUsd, 1);
    }

    return bMarketIdx - aMarketIdx;
  });
  return sortedPositions;
});
