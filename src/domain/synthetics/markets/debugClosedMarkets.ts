import { useMemo } from "react";

import { isDevelopment } from "config/env";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import type { ClosedMarkets, MarketsInfoData } from "./types";

export function useClosedMarketsWithDebug(
  closedMarkets: ClosedMarkets | undefined,
  marketsInfoData: MarketsInfoData | undefined
): ClosedMarkets | undefined {
  const { debugClosedMarkets } = useSettings();
  const symbols = isDevelopment() ? getDebugClosedMarketSymbols(debugClosedMarkets) : [];

  const forcedMarketsKey =
    symbols.length > 0 && marketsInfoData
      ? Object.values(marketsInfoData)
          .filter(
            (marketInfo) => !marketInfo.isSpotOnly && symbols.includes(marketInfo.indexToken.symbol.toUpperCase())
          )
          .map((marketInfo) => marketInfo.marketTokenAddress)
          .sort()
          .join(",")
      : "";

  return useMemo(() => {
    if (!forcedMarketsKey) {
      return closedMarkets;
    }

    const forcedClosedMarkets: ClosedMarkets = { ...closedMarkets };

    for (const marketTokenAddress of forcedMarketsKey.split(",")) {
      forcedClosedMarkets[marketTokenAddress] = true;
    }

    return forcedClosedMarkets;
  }, [closedMarkets, forcedMarketsKey]);
}

function getDebugClosedMarketSymbols(input: string | undefined): string[] {
  return (input ?? "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
}
