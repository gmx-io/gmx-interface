import { values } from "lodash";

import type { SortDirection } from "components/Sorter/Sorter";
import { getMarketListingDate } from "config/markets";
import { MarketTokensAPRData, PoolsInfoData, getMintableMarketTokens } from "domain/synthetics/markets";
import { getIsBaseApyReadyToBeShown } from "domain/synthetics/markets/getIsBaseApyReadyToBeShown";
import { convertToUsd, type TokensData } from "domain/synthetics/tokens";
import type { SortField } from "./PoolsList";
import { sortPoolsTokensDefault } from "./sortPoolsTokensDefault";
import { getMintableInfoGlv, isGlv } from "domain/synthetics/markets/glv";

export function sortPoolsTokensByField({
  chainId,
  poolsInfo,
  marketTokensData,
  orderBy,
  direction,
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  glvMarketsTokensApyData,
}: {
  chainId: number;
  poolsInfo: PoolsInfoData;
  marketTokensData: TokensData;
  orderBy: SortField;
  direction: SortDirection;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  glvMarketsTokensApyData: MarketTokensAPRData | undefined;
}) {
  const glvTokens = values(poolsInfo)
    .filter(isGlv)
    .map((pool) => pool.indexToken);
  const gmTokens = values(marketTokensData).concat(glvTokens);

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
      const poolA = poolsInfo[a.address];
      const poolB = poolsInfo[b.address];

      const mintableA = isGlv(poolA) ? getMintableInfoGlv(poolA) : getMintableMarketTokens(poolA, a);
      const mintableB = isGlv(poolB) ? getMintableInfoGlv(poolB) : getMintableMarketTokens(poolB, b);

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
      const bonusAprA = marketsTokensIncentiveAprData?.[a.address] ?? 0n;
      const lidoAprA = marketsTokensLidoAprData?.[a.address] ?? 0n;
      let aprA = bonusAprA + lidoAprA;
      if (getIsBaseApyReadyToBeShown(getMarketListingDate(chainId, a.address))) {
        aprA += marketsTokensApyData?.[a.address] ?? 0n;
      }

      const bonusAprB = marketsTokensIncentiveAprData?.[b.address] ?? 0n;
      const lidoAprB = marketsTokensLidoAprData?.[b.address] ?? 0n;
      let aprB = bonusAprB + lidoAprB;
      if (getIsBaseApyReadyToBeShown(getMarketListingDate(chainId, b.address))) {
        aprB += marketsTokensApyData?.[b.address] ?? 0n;
      }

      return aprA > aprB ? directionMultiplier : -directionMultiplier;
    });
  }

  return sortPoolsTokensDefault(poolsInfo, marketTokensData);
}
