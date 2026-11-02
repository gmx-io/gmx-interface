import uniq from "lodash/uniq";
import { useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";

import { selectIsOrdersLoading, selectOrdersInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getIsSizeIncreasePendingOrder } from "domain/synthetics/markets/closingMarkets";
import useSearchParams from "lib/useSearchParams";
import { isStopIncreaseOrderType, isTwapOrder } from "sdk/utils/orders";

import { OrderTypeFilterValue } from "./ordersFilters";

const CLOSING_POOL_ORDERS_QUERY_PARAM = "closingPoolOrders";

type SearchParams = {
  [CLOSING_POOL_ORDERS_QUERY_PARAM]?: string;
};

export type ClosingPoolOrdersView = {
  marketAddresses: string[];
  orderTypes: OrderTypeFilterValue[];
  orderKeys: string[];
};

export function getClosingPoolOrdersUrl(marketAddresses: string[]) {
  return `/trade?${CLOSING_POOL_ORDERS_QUERY_PARAM}=${marketAddresses.join(",")}`;
}

export function useViewClosingPoolOrdersByQueryParams(onView: (view: ClosingPoolOrdersView) => void) {
  const history = useHistory();
  const location = useLocation();
  const searchParams = useSearchParams<SearchParams>();
  const ordersInfoData = useSelector(selectOrdersInfoData);
  const isOrdersLoading = useSelector(selectIsOrdersLoading);

  const marketsParam = searchParams[CLOSING_POOL_ORDERS_QUERY_PARAM];

  useEffect(
    function viewClosingPoolOrdersByQueryParams() {
      if (!marketsParam || isOrdersLoading || !ordersInfoData) {
        return;
      }

      const marketAddresses = marketsParam.split(",");
      const orders = Object.values(ordersInfoData).filter(
        (order) => marketAddresses.includes(order.marketAddress) && getIsSizeIncreasePendingOrder(order)
      );

      onView({
        marketAddresses: uniq(orders.map((order) => order.marketAddress)),
        orderTypes: uniq(
          orders.map((order): OrderTypeFilterValue => {
            if (isTwapOrder(order)) {
              return "twap-increase";
            }

            return isStopIncreaseOrderType(order.orderType) ? "trigger-stop-market" : "trigger-limit";
          })
        ),
        orderKeys: orders.map((order) => order.key),
      });

      const nextSearchParams = new URLSearchParams(location.search);
      nextSearchParams.delete(CLOSING_POOL_ORDERS_QUERY_PARAM);
      history.replace({ search: nextSearchParams.toString() });
    },
    [history, isOrdersLoading, location.search, marketsParam, onView, ordersInfoData]
  );
}
