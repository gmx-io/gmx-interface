import { values } from "lodash";

import { MarketTokensAPRData, MarketsInfoData, getMintableMarketTokens } from "domain/synthetics/markets";
import type { TokensData } from "domain/synthetics/tokens";
import type { SortField } from "./GmList";
import type { SortDirection } from "./Sorter";
import { sortGmTokensDefault } from "./sortGmTokensDefault";

export function sortGmTokensByField({
  marketsInfoData,
  marketTokensData,
  orderBy,
  direction,
  marketsTokensApyData,
}: {
  marketsInfoData: MarketsInfoData;
  marketTokensData: TokensData;
  orderBy: SortField;
  direction: SortDirection;
  marketsTokensApyData: MarketTokensAPRData;
}) {
  const gmTokens = values(marketTokensData);
  const directionMultiplier = direction === "asc" ? 1 : -1;
  if (orderBy === "price") {
    return gmTokens.sort((a, b) => {
      return a.prices.minPrice > b.prices.minPrice ? directionMultiplier : -directionMultiplier;
    });
  }

  if (orderBy === "totalSupply") {
    return gmTokens.sort((a, b) => {
      return (a.totalSupply ?? 0n) > (b.totalSupply ?? 0n) ? directionMultiplier : -directionMultiplier;
    });
  }

  if (orderBy === "buyable") {
    return gmTokens.sort((a, b) => {
      const mintableA = getMintableMarketTokens(marketsInfoData[a.address], a);
      const mintableB = getMintableMarketTokens(marketsInfoData[b.address], b);
      return (mintableA?.mintableUsd ?? 0n) > (mintableB?.mintableUsd ?? 0n)
        ? directionMultiplier
        : -directionMultiplier;
    });
  }

  if (orderBy === "wallet") {
    return gmTokens.sort((a, b) => {
      return (a.balance ?? 0n) > (b.balance ?? 0n) ? directionMultiplier : -directionMultiplier;
    });
  }

  if (orderBy === "apy") {
    return gmTokens.sort((a, b) => {
      const aprA = marketsTokensApyData?.[a.address];
      const aprB = marketsTokensApyData?.[b.address];
      return (aprA ?? 0n) > (aprB ?? 0n) ? directionMultiplier : -directionMultiplier;
    });
  }

  return sortGmTokensDefault(marketsInfoData, marketTokensData);
}
