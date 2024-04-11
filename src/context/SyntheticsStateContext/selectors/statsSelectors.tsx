import { selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { marketsInfoDataToIndexTokensStats } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { EMPTY_ARRAY } from "lib/objects";
import { createSelector } from "../utils";

export const selectStatsMarketsInfoDataToIndexTokens = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);

  if (!marketsInfoData) {
    return EMPTY_ARRAY;
  }

  return marketsInfoDataToIndexTokensStats(marketsInfoData);
});
