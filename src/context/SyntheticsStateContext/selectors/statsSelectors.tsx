import { selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { marketsInfoDataToIndexTokensStats } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { createSelector } from "../utils";
import { EMPTY_ARRAY } from "lib/objects";

export const selectOrderedStatsMarketsInfoDataToIndexTokenStats = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);

  if (!marketsInfoData) {
    return EMPTY_ARRAY;
  }

  const stats = q(selectStatsMarketsInfoDataToIndexTokenStatsMap);

  return stats.sortedByTotalPoolValue.map((address) => stats.indexMap[address]);
});

const FALLBACK: ReturnType<typeof marketsInfoDataToIndexTokensStats> = {
  indexMap: {},
  sortedByTotalPoolValue: [],
};

export const selectStatsMarketsInfoDataToIndexTokenStatsMap = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);

  if (!marketsInfoData) {
    return FALLBACK;
  }

  return marketsInfoDataToIndexTokensStats(marketsInfoData);
});
