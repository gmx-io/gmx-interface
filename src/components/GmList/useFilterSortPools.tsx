import values from "lodash/values";
import { useMemo } from "react";

import type { SortDirection } from "context/SorterContext/types";
import type { SubCategoryTab, TopLevelTab } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { MultichainMarketTokensBalances } from "domain/multichain/types";
import { MarketTokensAPRData, MarketsInfoData, getMarketPoolName } from "domain/synthetics/markets";
import { PerformanceData } from "domain/synthetics/markets/usePerformanceAnnualized";
import { stripBlacklistedWords } from "domain/tokens/utils";
import { getByKey } from "lib/objects";
import { searchBy } from "lib/searchBy";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";
import { ProgressiveTokensData, TokenCategory } from "sdk/utils/tokens/types";

import type { SortField } from "./GmList";
import { sortGmTokensByField } from "./sortGmTokensByField";
import { sortGmTokensDefault } from "./sortGmTokensDefault";

const CRYPTO_CATEGORIES: TokenCategory[] = ["ai", "layer1", "layer2", "defi", "meme"];

export function useFilterSortPools({
  marketsInfo,
  marketTokensData,
  orderBy,
  direction,
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  searchText,
  topLevelTab,
  subCategoryTab,
  recentlyListedAddresses,
  favoriteTokens,
  performance,
  multichainMarketTokensBalances,
}: {
  performance: PerformanceData | undefined;
  marketsInfo: MarketsInfoData | undefined;
  marketTokensData: ProgressiveTokensData | undefined;
  orderBy: SortField;
  direction: SortDirection;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  searchText: string;
  topLevelTab: TopLevelTab;
  subCategoryTab: SubCategoryTab;
  recentlyListedAddresses?: Set<string>;
  favoriteTokens: string[];
  multichainMarketTokensBalances: MultichainMarketTokensBalances | undefined;
}) {
  const sortedTokens = useMemo(() => {
    if (!marketsInfo || !marketTokensData) {
      return [];
    }

    if (searchText.trim()) {
      return searchBy(
        values(marketTokensData),
        [
          (marketToken) => {
            const market = getByKey(marketsInfo, marketToken?.address);
            if (!market) return "";

            let name = "";
            let symbol = "";

            if (market.isSpotOnly) {
              symbol = "SWAP-ONLY";
              name = getMarketPoolName(market);
            } else {
              symbol = market.indexToken.symbol;
              const prefix = getTokenVisualMultiplier(market.indexToken);
              name = `${prefix}${stripBlacklistedWords(market.indexToken.name)}`;
            }

            return `${name} ${symbol}`;
          },
          (marketToken) => {
            const market = getByKey(marketsInfo, marketToken?.address);
            if (!market || market.isSpotOnly) return "";
            return (market.indexToken.searchAliases ?? []).join(" ");
          },
        ],
        searchText
      );
    }

    if (orderBy === "unspecified" || direction === "unspecified") {
      return sortGmTokensDefault({ marketsInfoData: marketsInfo, marketTokensData, multichainMarketTokensBalances });
    }

    return sortGmTokensByField({
      marketsInfo,
      marketTokensData,
      orderBy,
      direction,
      marketsTokensApyData,
      marketsTokensIncentiveAprData,
      marketsTokensLidoAprData,
      multichainMarketTokensBalances,
      performance,
    });
  }, [
    marketsInfo,
    marketTokensData,
    searchText,
    orderBy,
    direction,
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    marketsTokensLidoAprData,
    multichainMarketTokensBalances,
    performance,
  ]);

  const filteredTokens = useMemo(() => {
    return sortedTokens.filter((token) => {
      const market = getByKey(marketsInfo, token?.address);
      if (!market || market.isDisabled) return false;
      const marketTokenAddress = market.marketTokenAddress;

      let topLevelOk: boolean;
      switch (topLevelTab) {
        case "all":
          topLevelOk = true;
          break;
        case "favorites":
          topLevelOk = favoriteTokens?.includes(marketTokenAddress) ?? false;
          break;
        case "crypto":
          if (market.isSpotOnly) topLevelOk = false;
          else topLevelOk = Boolean(market.indexToken.categories?.some((c) => CRYPTO_CATEGORIES.includes(c)));
          break;
        case "tradfi":
          if (market.isSpotOnly) topLevelOk = false;
          else topLevelOk = Boolean(market.indexToken.categories?.includes("tradfi"));
          break;
        case "recently-listed":
          if (market.isSpotOnly) topLevelOk = false;
          else if (!recentlyListedAddresses || recentlyListedAddresses.size === 0) topLevelOk = false;
          else
            topLevelOk =
              recentlyListedAddresses.has(market.indexTokenAddress.toLowerCase()) ||
              recentlyListedAddresses.has(market.indexTokenAddress);
          break;
      }
      if (!topLevelOk) return false;

      if (subCategoryTab === "all") return true;
      if (topLevelTab !== "crypto" && topLevelTab !== "tradfi") return true;
      if (market.isSpotOnly) return false;
      return Boolean(market.indexToken.categories?.includes(subCategoryTab as TokenCategory));
    });
  }, [favoriteTokens, marketsInfo, sortedTokens, topLevelTab, subCategoryTab, recentlyListedAddresses]);

  return filteredTokens;
}
