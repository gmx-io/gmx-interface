import { getShiftAvailableMarkets } from "components/GmSwap/GmSwapBox/GmShiftBox/getShiftAvailableMarkets";

import { createSelector } from "../utils";
import { selectSortedMarketInfoByIndexToken } from "./selectSortedMarketInfoByIndexToken";

export const selectShiftAvailableMarkets = createSelector((q) => {
  const sortedMarketsInfoByIndexToken = q(selectSortedMarketInfoByIndexToken);

  return getShiftAvailableMarkets({
    markets: sortedMarketsInfoByIndexToken,
  });
});
