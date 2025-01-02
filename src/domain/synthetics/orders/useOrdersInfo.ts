import { getWrappedToken } from "sdk/configs/tokens";
import { getByKey } from "lib/objects";
import { useMemo } from "react";
import { MarketsInfoData } from "../markets";
import { TokensData } from "../tokens";
import { OrderType, OrdersInfoData } from "./types";
import { useOrders } from "./useOrders";
import { getOrderInfo } from "./utils";
import { MarketFilterLongShortItemData } from "components/Synthetics/TableMarketFilter/MarketFilterLongShort";

export type AggregatedOrdersDataResult = {
  ordersInfoData?: OrdersInfoData;
  count?: number;
  isLoading: boolean;
};

export function useOrdersInfoRequest(
  chainId: number,
  p: {
    marketsInfoData?: MarketsInfoData;
    marketsDirectionsFilter?: MarketFilterLongShortItemData[];
    orderTypesFilter?: OrderType[];
    tokensData?: TokensData;
    account: string | null | undefined;
  }
): AggregatedOrdersDataResult {
  const { marketsInfoData, tokensData, account, marketsDirectionsFilter, orderTypesFilter } = p;
  const { ordersData, count } = useOrders(chainId, {
    account,
    marketsDirectionsFilter,
    orderTypesFilter,
    marketsInfoData,
  });

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

    const ordersInfoData = Object.keys(ordersData).reduce((acc: OrdersInfoData, orderKey: string) => {
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
      count: count,
      ordersInfoData,
      isLoading: false,
    };
  }, [account, count, marketsInfoData, ordersData, tokensData, wrappedToken]);
}
