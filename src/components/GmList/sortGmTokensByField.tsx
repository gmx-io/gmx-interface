import values from "lodash/values";

import type { SortDirection } from "context/SorterContext/types";
import { MultichainMarketTokensBalances } from "domain/multichain/types";
import { MarketTokensAPRData, MarketsInfoData } from "domain/synthetics/markets";
import { PerformanceData } from "domain/synthetics/markets/usePerformanceAnnualized";
import { getIsPoolTokenPriceInvalid } from "domain/synthetics/markets/utils";
import { convertToUsd } from "domain/synthetics/tokens";
import { getByKey } from "lib/objects";
import { ProgressiveTokenData, ProgressiveTokensData } from "sdk/utils/tokens/types";

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
  marketsTokensLaunchBoostAprData,
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
  marketsTokensLaunchBoostAprData: MarketTokensAPRData | undefined;
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

  // invalid-price pools show N/A for APY and performance, so sort them like pools without data
  const getIsPriceInvalid = (token: ProgressiveTokenData) => {
    const marketInfo = getByKey(marketsInfo, token.address);
    return marketInfo !== undefined && getIsPoolTokenPriceInvalid(marketInfo, token);
  };

  if (orderBy === "apy") {
    const getApr = (token: ProgressiveTokenData) => {
      if (getIsPriceInvalid(token)) return 0n;

      return (
        (marketsTokensIncentiveAprData?.[token.address] ?? 0n) +
        (marketsTokensLidoAprData?.[token.address] ?? 0n) +
        (marketsTokensLaunchBoostAprData?.[token.address] ?? 0n) +
        (marketsTokensApyData?.[token.address] ?? 0n)
      );
    };

    return gmTokens.sort((a, b) => (getApr(a) > getApr(b) ? directionMultiplier : -directionMultiplier));
  }

  if (orderBy === "performance") {
    return gmTokens.sort((a, b) => {
      const performanceA = getIsPriceInvalid(a) ? 0n : performance?.[a.address] ?? 0n;
      const performanceB = getIsPriceInvalid(b) ? 0n : performance?.[b.address] ?? 0n;

      return performanceA > performanceB ? directionMultiplier : -directionMultiplier;
    });
  }

  return sortGmTokensDefault({ marketsInfoData: marketsInfo, marketTokensData, multichainMarketTokensBalances });
}
