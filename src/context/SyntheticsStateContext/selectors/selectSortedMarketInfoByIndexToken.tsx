import {
  selectDepositMarketTokensData,
  selectMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { sortMarketsWithIndexToken } from "domain/synthetics/trade/useSortedPoolsWithIndexToken";

export const selectSortedMarketInfoByIndexToken = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);

  const depositMarketTokensData = q(selectDepositMarketTokensData);

  const sortedMarketsInfoByIndexToken = sortMarketsWithIndexToken(marketsInfoData, depositMarketTokensData);

  return sortedMarketsInfoByIndexToken.marketsInfo;
});
