import { useMemo } from "react";
import { useMarketsInfo } from "../markets";
import { useAvailableTokensData } from "../tokens";
import { AggregatedOrdersData } from "./types";
import { useOrdersData } from "./useOrdersData";
import { getAggregatedOrderData } from "./utils";

type AggregatedOrdersDataResult = {
  aggregatedOrdersData: AggregatedOrdersData;
  isLoading: boolean;
};

export function useAggregatedOrdersData(chainId: number): AggregatedOrdersDataResult {
  const { tokensData, isLoading: isTokensLoading } = useAvailableTokensData(chainId);
  const { marketsInfoData, isLoading: isMarketsInfoLoading } = useMarketsInfo(chainId);
  const { ordersData, isLoading: isOrdersLoading } = useOrdersData(chainId);

  return useMemo(() => {
    const orderKeys = Object.keys(ordersData);

    return {
      aggregatedOrdersData: orderKeys.reduce((acc: AggregatedOrdersData, key) => {
        const aggregatedOrder = getAggregatedOrderData(ordersData, marketsInfoData, tokensData, key);

        if (aggregatedOrder) {
          acc[key] = aggregatedOrder;
        }

        return acc;
      }, {} as AggregatedOrdersData),
      isLoading: isTokensLoading || isMarketsInfoLoading || isOrdersLoading,
    };
  }, [isMarketsInfoLoading, isOrdersLoading, isTokensLoading, marketsInfoData, ordersData, tokensData]);
}
