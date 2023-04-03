import { useMemo } from "react";
import { useMarketsInfo } from "../markets";
import { useAvailableTokensData } from "../tokens";
import { AggregatedOrdersData } from "./types";
import { useOrdersData } from "./useOrdersData";
import { getAggregatedOrderData } from "./utils";

type AggregatedOrdersDataResult = {
  aggregatedOrdersData?: AggregatedOrdersData;
  isLoading: boolean;
};

export function useAggregatedOrdersData(chainId: number): AggregatedOrdersDataResult {
  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsInfoData } = useMarketsInfo(chainId);
  const { ordersData } = useOrdersData(chainId);

  return useMemo(() => {
    if (!marketsInfoData || !ordersData || !tokensData) {
      return {
        isLoading: true,
      };
    }

    const orderKeys = Object.keys(ordersData);

    return {
      aggregatedOrdersData: orderKeys.reduce((acc: AggregatedOrdersData, key) => {
        const aggregatedOrder = getAggregatedOrderData(ordersData, marketsInfoData || {}, tokensData, key);

        if (aggregatedOrder) {
          acc[key] = aggregatedOrder;
        }

        return acc;
      }, {} as AggregatedOrdersData),
      isLoading: false,
    };
  }, [marketsInfoData, ordersData, tokensData]);
}
