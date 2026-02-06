import values from "lodash/values";

import type { SortDirection } from "context/SorterContext/types";
import { MultichainMarketTokensBalances } from "domain/multichain/types";
import { MarketTokensAPRData, MarketsInfoData } from "domain/synthetics/markets";
import { PerformanceData } from "domain/synthetics/markets/usePerformanceAnnualized";
import { convertToUsd } from "domain/synthetics/tokens";
import { ProgressiveTokensData } from "sdk/utils/tokens/types";

import type { SortField } from "./GmList";
import { sortGmTokensDefault } from "./sortGmTokensDefault";

export function sortGmTokensByField({
  marketsInfo,
  marketTokensData,
  orderBy,
  direction,
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  performance,
  multichainMarketTokensBalances,
}: {
  marketsInfo: MarketsInfoData;
  marketTokensData: ProgressiveTokensData;
  orderBy: SortField;
  direction: SortDirection;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  performance: PerformanceData | undefined;
  multichainMarketTokensBalances: MultichainMarketTokensBalances | undefined;
}) {
  const gmTokens = values(marketTokensData);

  const directionMultiplier = direction === "asc" ? 1 : -1;
  if (orderBy === "price") {
    return gmTokens.sort((a, b) => {
      if (!a.prices || !b.prices) {
        return 0;
      }

      return a.prices.minPrice > b.prices.minPrice ? directionMultiplier : -directionMultiplier;
    });
  }

  if (orderBy === "totalSupply") {
    return gmTokens.sort((a, b) => {
      if (!a.prices || !b.prices) {
        return 0;
      }

      const totalSupplyUsdA = convertToUsd(a.totalSupply, a.decimals, a.prices.minPrice) ?? 0n;
      const totalSupplyUsdB = convertToUsd(b.totalSupply, b.decimals, b.prices.minPrice) ?? 0n;

      return totalSupplyUsdA > totalSupplyUsdB ? directionMultiplier : -directionMultiplier;
    });
  }

  if (orderBy === "balance") {
    return gmTokens.sort((a, b) => {
      if (!a.prices || !b.prices) {
        return 0;
      }

      const aUsd = multichainMarketTokensBalances?.[a.address]?.totalBalanceUsd ?? 0n;
      const bUsd = multichainMarketTokensBalances?.[b.address]?.totalBalanceUsd ?? 0n;

      return aUsd > bUsd ? directionMultiplier : -directionMultiplier;
    });
  }

  if (orderBy === "apy") {
    return gmTokens.sort((a, b) => {
      const bonusAprA = marketsTokensIncentiveAprData?.[a.address] ?? 0n;
      const lidoAprA = marketsTokensLidoAprData?.[a.address] ?? 0n;
      let aprA = bonusAprA + lidoAprA;

      aprA += marketsTokensApyData?.[a.address] ?? 0n;

      const bonusAprB = marketsTokensIncentiveAprData?.[b.address] ?? 0n;
      const lidoAprB = marketsTokensLidoAprData?.[b.address] ?? 0n;
      let aprB = bonusAprB + lidoAprB;

      aprB += marketsTokensApyData?.[b.address] ?? 0n;

      return aprA > aprB ? directionMultiplier : -directionMultiplier;
    });
  }

  if (orderBy === "performance") {
    return gmTokens.sort((a, b) => {
      const performanceA = performance?.[a.address] ?? 0n;
      const performanceB = performance?.[b.address] ?? 0n;

      return performanceA > performanceB ? directionMultiplier : -directionMultiplier;
    });
  }

  return sortGmTokensDefault({ marketsInfoData: marketsInfo, marketTokensData, multichainMarketTokensBalances });
}
