import { getByKey } from "lib/objects";
import groupBy from "lodash/groupBy";
import { useMemo } from "react";
import { MarketInfo, MarketsInfoData } from "../markets";
import { TokenData, TokensData, convertToUsd } from "../tokens";

function useSortedPoolsWithIndexToken(marketsInfoData?: MarketsInfoData, marketTokensData?: TokensData) {
  const sortedMarketsWithIndexToken = useMemo(() => {
    if (!marketsInfoData || !marketTokensData) {
      return {
        markets: [],
        marketsInfo: [],
      };
    }
    // Group markets by index token address
    const groupedMarketList: { [marketAddress: string]: MarketInfo[] } = groupBy(
      Object.values(marketsInfoData),
      (market) => market[market.isSpotOnly ? "marketTokenAddress" : "indexTokenAddress"]
    );

    const allMarkets = Object.values(groupedMarketList)
      .map((markets) => {
        return markets
          .filter((market) => {
            const marketInfoData = getByKey(marketsInfoData, market.marketTokenAddress)!;
            return !marketInfoData.isDisabled;
          })
          .map((market) => getByKey(marketTokensData, market.marketTokenAddress)!);
      })
      .filter((markets) => markets.length > 0);

    const sortedGroups = allMarkets!.sort((a, b) => {
      const totalMarketSupplyA = a.reduce((acc, market) => {
        const totalSupplyUsd = convertToUsd(market?.totalSupply, market?.decimals, market?.prices.minPrice);
        acc = acc + (totalSupplyUsd ?? 0n);
        return acc;
      }, 0n);

      const totalMarketSupplyB = b.reduce((acc, market) => {
        const totalSupplyUsd = convertToUsd(market?.totalSupply, market?.decimals, market?.prices.minPrice);
        acc = acc + (totalSupplyUsd ?? 0n);
        return acc;
      }, 0n);

      return totalMarketSupplyA > totalMarketSupplyB ? -1 : 1;
    });

    // Sort markets within each group by total supply
    const sortedMarkets = sortedGroups.map((markets) => {
      return markets.sort((a, b) => {
        const totalSupplyUsdA = convertToUsd(a.totalSupply, a.decimals, a.prices.minPrice)!;
        const totalSupplyUsdB = convertToUsd(b.totalSupply, b.decimals, b.prices.minPrice)!;
        return totalSupplyUsdA > totalSupplyUsdB ? -1 : 1;
      });
    });

    // Flatten the sorted markets array
    const flattenedMarkets = sortedMarkets.flat(Infinity).filter(Boolean) as TokenData[];
    return {
      markets: flattenedMarkets,
      marketsInfo: flattenedMarkets.map((market) => getByKey(marketsInfoData, market.address)!),
    };
  }, [marketsInfoData, marketTokensData]);
  return sortedMarketsWithIndexToken;
}

export default useSortedPoolsWithIndexToken;
