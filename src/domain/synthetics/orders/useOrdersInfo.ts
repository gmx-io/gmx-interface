import { getWrappedToken } from "config/tokens";
import { getByKey } from "lib/objects";
import { useMemo } from "react";
import { MarketsInfoData } from "../markets";
import { TokensData } from "../tokens";
import { OrdersInfoData } from "./types";
import { useOrders } from "./useOrders";
import { getOrderInfo, isVisibleOrder } from "./utils";

export type AggregatedOrdersDataResult = {
  ordersInfoData?: OrdersInfoData;
  isLoading: boolean;
};

export function useOrdersInfoRequest(
  chainId: number,
  p: {
    marketsInfoData?: MarketsInfoData;
    tokensData?: TokensData;
    account: string | null | undefined;
  }
): AggregatedOrdersDataResult {
  const { marketsInfoData, tokensData, account } = p;
  const { ordersData } = useOrders(chainId, { account });

  const wrappedToken = getWrappedToken(chainId);

  return useMemo(() => {
    if (!account) {
      return {
        isLoading: false,
      };
    }

    if (!marketsInfoData || !ordersData || !tokensData) {
      return {
        isLoading: true,
      };
    }

    const ordersInfoData = Object.keys(ordersData)
      .filter((orderKey) => isVisibleOrder(ordersData[orderKey].orderType))
      .reduce((acc: OrdersInfoData, orderKey: string) => {
        const order = getByKey(ordersData, orderKey)!;

        const orderInfo = getOrderInfo({
          marketsInfoData,
          tokensData,
          wrappedNativeToken: wrappedToken,
          order,
        });

        if (!orderInfo) {
          // eslint-disable-next-line no-console
          console.warn(`OrderInfo parsing error`, order);

          return acc;
        }

        acc[orderKey] = orderInfo;

        return acc;
      }, {} as OrdersInfoData);

    return {
      ordersInfoData,
      isLoading: false,
    };
  }, [account, marketsInfoData, ordersData, tokensData, wrappedToken]);
}
