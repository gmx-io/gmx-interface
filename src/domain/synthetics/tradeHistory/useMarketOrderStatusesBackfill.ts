import { useEffect } from "react";
import useSWR from "swr";

import { OrderStatuses, PendingOrderData } from "context/SyntheticsEvents/types";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

import {
  MARKET_ORDER_BACKFILL_PAGE_SIZE,
  MarketOrderBackfillMatch,
  getMarketOrderBackfillMatches,
  getMarketOrderBackfillParams,
} from "./marketOrderStatusesBackfill";
import { fetchRawTradeActions } from "./useTradeHistory";

// Recovers order statuses from the trade history indexer for pending market
// orders whose websocket events were missed, so their toasts can still resolve.
export function useMarketOrderStatusesBackfill({
  chainId,
  pendingOrders,
  orderStatuses,
  onMatches,
}: {
  chainId: number;
  pendingOrders: PendingOrderData[];
  orderStatuses: OrderStatuses;
  onMatches: (matches: MarketOrderBackfillMatch[]) => void;
}) {
  const params = getMarketOrderBackfillParams(pendingOrders);

  const combinationsKey = params?.orderEventCombinations
    .map((combination) =>
      [combination.eventName, combination.orderType.join("-"), combination.isDepositOrWithdraw].join(":")
    )
    .join(",");

  const { data: rawActions } = useSWR(
    params ? ["marketOrderStatusesBackfill", chainId, params.account, params.fromTxTimestamp, combinationsKey] : null,
    {
      fetcher: () =>
        fetchRawTradeActions({
          chainId,
          pageIndex: 0,
          pageSize: MARKET_ORDER_BACKFILL_PAGE_SIZE,
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
    const matches = getMarketOrderBackfillMatches(pendingOrders, rawActions, orderStatuses);

    if (matches.length > 0) {
      onMatches(matches);
    }
  }, [onMatches, orderStatuses, pendingOrders, rawActions]);
}
