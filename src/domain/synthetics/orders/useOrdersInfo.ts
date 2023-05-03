import { getWrappedToken } from "config/tokens";
import { getByKey } from "lib/objects";
import { useMemo } from "react";
import { useMarketsInfo } from "../markets";
import { useAvailableTokensData } from "../tokens";
import { OrdersInfoData } from "./types";
import { useOrders } from "./useOrders";
import { getOrderInfo, isVisibleOrder } from "./utils";

type AggregatedOrdersDataResult = {
  ordersInfoData?: OrdersInfoData;
  isLoading: boolean;
};

export function useOrdersInfo(chainId: number): AggregatedOrdersDataResult {
  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsInfoData } = useMarketsInfo(chainId);
  const { ordersData } = useOrders(chainId);

  const wrappedToken = getWrappedToken(chainId);

  return useMemo(() => {
    if (!marketsInfoData || !ordersData || !tokensData) {
      return {
        isLoading: true,
      };
    }

    const ordersInfoData = Object.keys(ordersData)
      .filter((orderKey) => isVisibleOrder(ordersData[orderKey].orderType))
      .reduce((acc: OrdersInfoData, orderKey: string) => {
        const order = getByKey(ordersData, orderKey)!;

        const orderInfo = getOrderInfo(marketsInfoData, tokensData, wrappedToken, order);

        if (!orderInfo) {
          // eslint-disable-next-line no-console
          console.warn(`OrderInfo parsing error`, JSON.stringify(order));

          return acc;
        }

        acc[orderKey] = orderInfo;

        return acc;
      }, {} as OrdersInfoData);

    return {
      ordersInfoData,
      isLoading: false,
    };
  }, [marketsInfoData, ordersData, tokensData, wrappedToken]);
}
