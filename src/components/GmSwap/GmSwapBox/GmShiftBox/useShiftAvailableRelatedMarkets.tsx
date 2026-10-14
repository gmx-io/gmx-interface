import { useMemo } from "react";

import { selectAccountWhitelistsResult } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { GlvAndGmMarketsInfoData, GlvOrMarketInfo } from "domain/synthetics/markets/types";

import { getShiftAvailableRelatedMarkets } from "./getShiftAvailableRelatedMarkets";

export function useShiftAvailableRelatedMarkets(
  chainId: number,
  marketsInfoData: GlvAndGmMarketsInfoData | undefined,
  sortedMarketsInfoByIndexToken: GlvOrMarketInfo[],
  marketTokenAddress?: string
) {
  const whitelistsResult = useSelector(selectAccountWhitelistsResult);

  const shiftAvailableRelatedMarkets: GlvOrMarketInfo[] = useMemo(
    () =>
      getShiftAvailableRelatedMarkets({
        chainId,
        marketsInfoData,
        sortedMarketsInfoByIndexToken,
        marketTokenAddress,
        whitelistsResult,
      }),
    [chainId, marketTokenAddress, marketsInfoData, sortedMarketsInfoByIndexToken, whitelistsResult]
  );

  return shiftAvailableRelatedMarkets;
}
