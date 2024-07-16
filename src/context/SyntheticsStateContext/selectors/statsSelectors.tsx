import { selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { marketsInfoData2IndexTokenStatsMap } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { createSelector } from "../utils";
import { EMPTY_ARRAY } from "lib/objects";

export const selectIndexTokenStats = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);

  if (!marketsInfoData) {
    return EMPTY_ARRAY;
  }

  const stats = q(selectIndexTokenStatsMap);

  return stats.sortedByTotalPoolValue.map((address) => stats.indexMap[address]!);
});

const FALLBACK: ReturnType<typeof marketsInfoData2IndexTokenStatsMap> = {
  indexMap: {},
  sortedByTotalPoolValue: [],
};

export const selectIndexTokenStatsMap = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);

  if (!marketsInfoData) {
    return FALLBACK;
  }

  return marketsInfoData2IndexTokenStatsMap(marketsInfoData);
});
