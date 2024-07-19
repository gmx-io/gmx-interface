import { values } from "lodash";

import type { SortDirection } from "components/Sorter/Sorter";
import { MarketTokensAPRData, MarketsInfoData, getMintableMarketTokens } from "domain/synthetics/markets";
import { convertToUsd, type TokensData } from "domain/synthetics/tokens";
import type { SortField } from "./GmList";
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
      const aUsd = convertToUsd(a.balance, a.decimals, a.prices.minPrice) ?? 0n;
      const bUsd = convertToUsd(b.balance, b.decimals, b.prices.minPrice) ?? 0n;

      return aUsd > bUsd ? directionMultiplier : -directionMultiplier;
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
