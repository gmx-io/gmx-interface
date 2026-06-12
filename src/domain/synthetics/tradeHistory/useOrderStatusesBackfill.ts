import { useEffect } from "react";
import useSWR from "swr";

import { OrderStatuses, PendingOrderData } from "context/SyntheticsEvents/types";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

import {
  ORDER_BACKFILL_PAGE_SIZE,
  OrderBackfillMatch,
  getOrderBackfillMatches,
  getOrderBackfillParams,
} from "./orderStatusesBackfill";
import { fetchRawTradeActions } from "./useTradeHistory";

export function useOrderStatusesBackfill({
  chainId,
  pendingOrders,
  orderStatuses,
  onMatches,
}: {
  chainId: number;
  pendingOrders: PendingOrderData[];
  orderStatuses: OrderStatuses;
  onMatches: (matches: OrderBackfillMatch[]) => void;
}) {
  const params = getOrderBackfillParams(pendingOrders);

  const combinationsKey = params?.orderEventCombinations
    .map((combination) =>
      [combination.eventName, combination.orderType.join("-"), combination.isDepositOrWithdraw].join(":")
    )
    .join(",");

  const { data: rawActions } = useSWR(
    params ? ["orderStatusesBackfill", chainId, params.account, params.fromTxTimestamp, combinationsKey] : null,
    {
      fetcher: () =>
        fetchRawTradeActions({
          chainId,
          pageIndex: 0,
          pageSize: ORDER_BACKFILL_PAGE_SIZE,
          marketsDirectionsFilter: undefined,
          forAllAccounts: false,
          account: params!.account,
          fromTxTimestamp: params!.fromTxTimestamp,
          toTxTimestamp: undefined,
          orderEventCombinations: params!.orderEventCombinations,
        }),
      refreshInterval: FREQUENT_UPDATE_INTERVAL,
    }
  );

  useEffect(() => {
    const matches = getOrderBackfillMatches(pendingOrders, rawActions, orderStatuses);

    if (matches.length > 0) {
      onMatches(matches);
    }
  }, [onMatches, orderStatuses, pendingOrders, rawActions]);
}
