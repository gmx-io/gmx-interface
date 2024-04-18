import { selectMarketsInfoData } from "../selectors/globalSelectors";
import { useSelector } from "../utils";

export const useMarketInfo = (marketAddress: string) => {
  return useSelector((s) => selectMarketsInfoData(s)?.[marketAddress]);
};
