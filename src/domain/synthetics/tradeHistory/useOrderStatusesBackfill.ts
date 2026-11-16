import { useEffect } from "react";
import useSWR from "swr";

import { OrderStatuses } from "context/SyntheticsEvents/types";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

import {
  ORDER_BACKFILL_PAGE_SIZE,
  OrderBackfillMatch,
  OrderBackfillPendingOrder,
  getOrderBackfillMatches,
  getOrderBackfillParams,
} from "./orderStatusesBackfill";
import { fetchRawTradeActions, type RawTradeActionsResult } from "./useTradeHistory";

export function useOrderStatusesBackfill({
  chainId,
  pendingOrders,
  orderStatuses,
  onMatches,
}: {
  chainId: number;
  pendingOrders: OrderBackfillPendingOrder[];
  orderStatuses: OrderStatuses;
  onMatches: (matches: OrderBackfillMatch[]) => void;
}) {
  const params = getOrderBackfillParams(pendingOrders);

  const combinationsKey = params?.orderEventCombinations
    .map((combination) =>
      [combination.eventName, combination.orderType.join("-"), combination.isDepositOrWithdraw].join(":")
    )
    .join(",");

  const { data } = useSWR<RawTradeActionsResult | undefined>(
    params
      ? [
          "orderStatusesBackfill",
          chainId,
          params.account,
          params.fromTxTimestamp,
          combinationsKey,
          params.orderKeys,
          params.transactionHashes,
        ]
      : null,
    {
      fetcher: () =>
        fetchRawTradeActions({
          chainId,
          pageIndex: 0,
          pageSize: ORDER_BACKFILL_PAGE_SIZE,
          marketsDirectionsFilter: undefined,
          forAllAccounts: false,
          account: params!.account,
          orderKeys: params!.orderKeys,
          transactionHashes: params!.transactionHashes,
          fromTxTimestamp: params!.fromTxTimestamp,
          toTxTimestamp: undefined,
          orderEventCombinations: params!.orderEventCombinations,
        }),
      refreshInterval: FREQUENT_UPDATE_INTERVAL,
    }
  );
  const rawActions = data?.tradeActions;

  useEffect(() => {
    const matches = getOrderBackfillMatches(pendingOrders, rawActions, orderStatuses);

    if (matches.length > 0) {
      onMatches(matches);
    }
  }, [onMatches, orderStatuses, pendingOrders, rawActions]);
}
