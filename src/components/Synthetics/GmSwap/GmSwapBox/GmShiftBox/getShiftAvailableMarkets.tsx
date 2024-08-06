import type { MarketInfo } from "domain/synthetics/markets/types";
import { getMarketPoolName } from "domain/synthetics/markets/utils";
import { EMPTY_ARRAY } from "lib/objects";

export function getShiftAvailableMarkets({ markets }: { markets: MarketInfo[] }): MarketInfo[] {
  if (markets.length === 0) {
    return EMPTY_ARRAY;
  }

  const shiftGroups: { [longShortKey: string]: MarketInfo[] } = {};

  for (const marketInfo of markets) {
    const longShortKey = getMarketPoolName(marketInfo);

    if (!shiftGroups[longShortKey]) {
      shiftGroups[longShortKey] = [];
    }

    shiftGroups[longShortKey].push(marketInfo);
  }

  const availableMarkets: MarketInfo[] = [];

  for (const marketInfo of markets) {
    const longShortKey = getMarketPoolName(marketInfo);

    const multipleRelatedMarkets = shiftGroups[longShortKey].length > 1;
    if (multipleRelatedMarkets) {
      availableMarkets.push(marketInfo);
    }
  }

  return availableMarkets;
}
