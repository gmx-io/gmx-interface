import { useMemo } from "react";
import { MarketInfo, MarketsInfoData } from "../markets";
import groupBy from "lodash/groupBy";
import { getByKey } from "lib/objects";
import { TokensData, convertToUsd } from "../tokens";
import { bigNumberify } from "lib/numbers";

function useSortedMarketsWithIndexToken(marketsInfoData?: MarketsInfoData, marketTokensData?: TokensData) {
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
        acc = acc.add(totalSupplyUsd || 0);
        return acc;
      }, bigNumberify(0)!);

      const totalMarketSupplyB = b.reduce((acc, market) => {
        const totalSupplyUsd = convertToUsd(market?.totalSupply, market?.decimals, market?.prices.minPrice);
        acc = acc.add(totalSupplyUsd || 0);
        return acc;
      }, bigNumberify(0)!);

      return totalMarketSupplyA.gt(totalMarketSupplyB) ? -1 : 1;
    });

    // Sort markets within each group by total supply
    const sortedMarkets = sortedGroups.map((markets: any) => {
      return markets.sort((a, b) => {
        const totalSupplyUsdA = convertToUsd(a.totalSupply, a.decimals, a.prices.minPrice)!;
        const totalSupplyUsdB = convertToUsd(b.totalSupply, b.decimals, b.prices.minPrice)!;
        return totalSupplyUsdA.gt(totalSupplyUsdB) ? -1 : 1;
      });
    });

    // Flatten the sorted markets array
    const flattenedMarkets = sortedMarkets.flat(Infinity).filter(Boolean);
    return {
      markets: flattenedMarkets,
      marketsInfo: flattenedMarkets.map((market) => getByKey(marketsInfoData, market.address)!),
    };
  }, [marketsInfoData, marketTokensData]);
  return sortedMarketsWithIndexToken;
}

export default useSortedMarketsWithIndexToken;
