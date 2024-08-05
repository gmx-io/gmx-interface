import { useMemo } from "react";

import type { MarketInfo, MarketsInfoData } from "domain/synthetics/markets/types";

import { getShiftAvailableRelatedMarkets } from "./getShiftAvailableRelatedMarkets";

export function useShiftAvailableRelatedMarkets(
  marketsInfoData: MarketsInfoData | undefined,
  sortedMarketsInfoByIndexToken: MarketInfo[],
  marketTokenAddress?: string
) {
  const shiftAvailableMarkets: MarketInfo[] = useMemo(
    () =>
      getShiftAvailableRelatedMarkets({
        marketsInfoData,
        sortedMarketsInfoByIndexToken,
        marketTokenAddress,
      }),
    [marketTokenAddress, marketsInfoData, sortedMarketsInfoByIndexToken]
  );

  return shiftAvailableMarkets;
}
