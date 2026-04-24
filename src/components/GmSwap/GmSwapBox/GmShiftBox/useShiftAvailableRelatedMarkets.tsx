import { useMemo } from "react";

import type { GlvAndGmMarketsInfoData, GlvOrMarketInfo } from "domain/synthetics/markets/types";

import { getShiftAvailableRelatedMarkets } from "./getShiftAvailableRelatedMarkets";

export function useShiftAvailableRelatedMarkets(
  chainId: number,
  marketsInfoData: GlvAndGmMarketsInfoData | undefined,
  sortedMarketsInfoByIndexToken: GlvOrMarketInfo[],
  marketTokenAddress?: string
) {
  const shiftAvailableRelatedMarkets: GlvOrMarketInfo[] = useMemo(
    () =>
      getShiftAvailableRelatedMarkets({
        chainId,
        marketsInfoData,
        sortedMarketsInfoByIndexToken,
        marketTokenAddress,
      }),
    [chainId, marketTokenAddress, marketsInfoData, sortedMarketsInfoByIndexToken]
  );

  return shiftAvailableRelatedMarkets;
}
