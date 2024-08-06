import type { MarketInfo } from "domain/synthetics/markets/types";
import { EMPTY_ARRAY } from "lib/objects";

export function getShiftAvailableMarkets({ markets }: { markets: MarketInfo[] }): MarketInfo[] {
  if (markets.length === 0) {
    return EMPTY_ARRAY;
  }

  const shiftGroups: { [longShortKey: string]: MarketInfo[] } = {};

  for (const marketInfo of markets) {
    const longShortKey = `${marketInfo.longTokenAddress}-${marketInfo.shortTokenAddress}`;

    if (!shiftGroups[longShortKey]) {
      shiftGroups[longShortKey] = [];
    }

    shiftGroups[longShortKey].push(marketInfo);
  }

  const availableMarkets: MarketInfo[] = [];

  for (const marketInfo of markets) {
    const longShortKey = `${marketInfo.longTokenAddress}-${marketInfo.shortTokenAddress}`;

    if (shiftGroups[longShortKey].length > 1) {
      availableMarkets.push(marketInfo);
    }
  }

  return availableMarkets;
}
