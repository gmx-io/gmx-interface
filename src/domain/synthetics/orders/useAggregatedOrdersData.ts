import { useMemo } from "react";
import { useMarketsData } from "../markets";
import { useAvailableTokensData } from "../tokens";
import { useOrdersData } from "./useOrdersData";
import { AggregatedOrdersData } from "./types";
import { getAggregatedOrderData } from "./utils";

type AggregatedOrdersDataResult = {
  aggregatedOrdersData: AggregatedOrdersData;
  isLoading: boolean;
};

export function useAggregatedOrdersData(chainId: number): AggregatedOrdersDataResult {
  const { tokensData, isLoading: isTokensLoading } = useAvailableTokensData(chainId);
  const { marketsData, isLoading: isMarketsLoading } = useMarketsData(chainId);
  const { ordersData, isLoading: isOrdersLoading } = useOrdersData(chainId);

  return useMemo(() => {
    const orderKeys = Object.keys(ordersData);

    return {
      aggregatedOrdersData: orderKeys.reduce((acc: AggregatedOrdersData, key) => {
        const aggregatedOrder = getAggregatedOrderData(ordersData, marketsData, tokensData, key);

        if (aggregatedOrder) {
          acc[key] = aggregatedOrder;
        }

        return acc;
      }, {} as AggregatedOrdersData),
      isLoading: isTokensLoading || isMarketsLoading || isOrdersLoading,
    };
  }, [isMarketsLoading, isOrdersLoading, isTokensLoading, marketsData, ordersData, tokensData]);
}
