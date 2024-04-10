import { selectStatsMarketsInfoDataToIndexTokens } from "../selectors/statsSelectors";
import { useSelector } from "../utils";

export const useMarketsInfoDataToIndexTokensStats = () => useSelector(selectStatsMarketsInfoDataToIndexTokens);
