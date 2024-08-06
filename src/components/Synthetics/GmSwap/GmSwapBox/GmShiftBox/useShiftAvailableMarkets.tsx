import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { createSelector, useSelector } from "context/SyntheticsStateContext/utils";
import type { MarketInfo } from "domain/synthetics/markets/types";
import { sortMarketsWithIndexToken } from "domain/synthetics/trade/useSortedPoolsWithIndexToken";

import { getShiftAvailableMarkets } from "./getShiftAvailableMarkets";

const selectMarketTokensForDepositData = (s: SyntheticsState) => s.globals.depositMarketTokensData;

const selectSortedMarketInfoByIndexToken = createSelector((q) => {
  const marketsInfoData = q(selectMarketsInfoData);

  const depositMarketTokensData = q(selectMarketTokensForDepositData);

  const sortedMarketsInfoByIndexToken = sortMarketsWithIndexToken(marketsInfoData, depositMarketTokensData);

  return sortedMarketsInfoByIndexToken.marketsInfo;
});

const selectShiftAvailableMarkets = createSelector((q) => {
  const sortedMarketsInfoByIndexToken = q(selectSortedMarketInfoByIndexToken);

  return getShiftAvailableMarkets({
    markets: sortedMarketsInfoByIndexToken,
  });
});

export function useShiftAvailableMarkets() {
  const shiftAvailableMarkets: MarketInfo[] = useSelector(selectShiftAvailableMarkets);

  return shiftAvailableMarkets;
}
