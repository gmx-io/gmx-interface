import { selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { createEnhancedSelector } from "context/SyntheticsStateContext/utils";
import { marketsInfoDataToIndexTokensStats } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { EMPTY_ARRAY } from "lib/objects";

export const selectStatsMarketsInfoDataToIndexTokens = createEnhancedSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);

  if (!marketsInfoData) {
    return EMPTY_ARRAY;
  }

  return marketsInfoDataToIndexTokensStats(marketsInfoData);
});
