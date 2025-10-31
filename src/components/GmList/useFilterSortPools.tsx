import values from "lodash/values";
import { useMemo } from "react";

import type { SortDirection } from "context/SorterContext/types";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { TokenFavoritesTabOption } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { MarketTokensAPRData, MarketsInfoData, getMarketPoolName } from "domain/synthetics/markets";
import { PerformanceData } from "domain/synthetics/markets/usePerformanceAnnualized";
import { stripBlacklistedWords } from "domain/tokens/utils";
import { getByKey } from "lib/objects";
import { searchBy } from "lib/searchBy";
import { getCategoryTokenAddresses, getTokenVisualMultiplier } from "sdk/configs/tokens";
import { ProgressiveTokensData } from "sdk/types/tokens";

import type { SortField } from "./GmList";
import { sortGmTokensByField } from "./sortGmTokensByField";
import { sortGmTokensDefault } from "./sortGmTokensDefault";

export function useFilterSortPools({
  marketsInfo,
  marketTokensData,
  orderBy,
  direction,
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  searchText,
  tab,
  favoriteTokens,
  performance,
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
  tab: TokenFavoritesTabOption;
  favoriteTokens: string[];
}) {
  const chainId = useSelector(selectChainId);

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
        ],
        searchText
      );
    }

    if (orderBy === "unspecified" || direction === "unspecified") {
      return sortGmTokensDefault(marketsInfo, marketTokensData);
    }

    return sortGmTokensByField({
      marketsInfo,
      marketTokensData,
      orderBy,
      direction,
      marketsTokensApyData,
      marketsTokensIncentiveAprData,
      marketsTokensLidoAprData,
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
    performance,
  ]);

  const filteredTokens = useMemo(() => {
    if (!searchText.trim() && tab === "all") {
      return sortedTokens;
    }

    return sortedTokens.filter((token) => {
      const market = getByKey(marketsInfo, token?.address);

      if (!market || market.isDisabled) {
        return false;
      }

      const marketTokenAddress = market.marketTokenAddress;

      if (tab === "all") {
        return true;
      } else if (tab === "favorites") {
        return favoriteTokens?.includes(marketTokenAddress);
      } else {
        const categoryTokenAddresses = getCategoryTokenAddresses(chainId, tab);

        if (market.isSpotOnly) {
          return false;
        }

        return categoryTokenAddresses.includes(market.indexTokenAddress);
      }
    });
  }, [chainId, favoriteTokens, marketsInfo, searchText, sortedTokens, tab]);

  return filteredTokens;
}
