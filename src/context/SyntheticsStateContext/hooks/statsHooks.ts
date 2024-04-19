import { selectIndexTokenStats } from "../selectors/statsSelectors";
import { useSelector } from "../utils";

export const useMarketsInfoDataToIndexTokensStats = () => useSelector(selectIndexTokenStats);
