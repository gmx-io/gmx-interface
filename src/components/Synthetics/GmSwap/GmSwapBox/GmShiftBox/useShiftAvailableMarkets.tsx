import { useMemo } from "react";

import type { MarketInfo } from "domain/synthetics/markets/types";

import { getShiftAvailableMarkets } from "./getShiftAvailableMarkets";

export function useShiftAvailableMarkets(sortedMarketsInfoByIndexToken: MarketInfo[]) {
  const shiftAvailableMarkets: MarketInfo[] = useMemo(
    () =>
      getShiftAvailableMarkets({
        sortedMarketsInfoByIndexToken,
      }),
    [sortedMarketsInfoByIndexToken]
  );

  return shiftAvailableMarkets;
}
