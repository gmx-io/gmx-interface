import { useMemo } from "react";

import type { GlvAndGmMarketsInfoData, GlvOrMarketInfo } from "domain/synthetics/markets/types";

import { getShiftAvailableRelatedMarkets } from "./getShiftAvailableRelatedMarkets";

export function useShiftAvailableRelatedMarkets(
  marketsInfoData: GlvAndGmMarketsInfoData | undefined,
  sortedMarketsInfoByIndexToken: GlvOrMarketInfo[],
  marketTokenAddress?: string
) {
  const shiftAvailableRelatedMarkets: GlvOrMarketInfo[] = useMemo(
    () =>
      getShiftAvailableRelatedMarkets({
        marketsInfoData,
        sortedMarketsInfoByIndexToken,
        marketTokenAddress,
      }),
    [marketTokenAddress, marketsInfoData, sortedMarketsInfoByIndexToken]
  );

  return shiftAvailableRelatedMarkets;
}
