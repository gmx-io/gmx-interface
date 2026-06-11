import { isDecreaseOrderType, isLiquidationOrderType, isTriggerDecreaseOrderType } from "domain/synthetics/orders";
import { isPositionTradeAction, PositionTradeAction, TradeAction, TradeActionType } from "sdk/utils/tradeHistory/types";

import type { MarketFilterLongShortItemData } from "components/TableMarketFilter/MarketFilterLongShort";

import type { TradeHistoryActionFilter } from "./displayFilters";

export type PositionLifecycleFilter = {
  positionKey: string;
  sourceActionId: string;
};

export function resolveTradeHistoryFetchParams({
  positionLifecycleFilter,
  fromTxTimestamp,
  toTxTimestamp,
  marketsDirectionsFilter,
  orderEventCombinations,
}: {
  positionLifecycleFilter: PositionLifecycleFilter | undefined;
  fromTxTimestamp: number | undefined;
  toTxTimestamp: number | undefined;
  marketsDirectionsFilter: MarketFilterLongShortItemData[] | undefined;
  orderEventCombinations: TradeHistoryActionFilter[] | undefined;
}) {
  if (!positionLifecycleFilter) {
    return {
      fromTxTimestamp,
      toTxTimestamp,
      marketsDirectionsFilter,
      orderEventCombinations,
      positionKey: undefined,
    };
  }

  // Lifecycle mode fetches the position's whole history server-side;
  // the user's display filters are re-applied client-side afterwards.
  return {
    fromTxTimestamp: undefined,
    toTxTimestamp: undefined,
    marketsDirectionsFilter: [],
    orderEventCombinations: undefined,
    positionKey: positionLifecycleFilter.positionKey,
  };
}

export function getPositionLifecycleSlice(
  tradeActions: TradeAction[] | undefined,
  lifecycleFilter: PositionLifecycleFilter | undefined
): {
  tradeActions: TradeAction[] | undefined;
  needsMoreData: boolean;
} {
  if (!tradeActions || !lifecycleFilter) {
    return { tradeActions, needsMoreData: false };
  }

  const matchingPositionActions = tradeActions.filter(
    (action): action is PositionTradeAction =>
      isPositionTradeAction(action) && action.positionKey === lifecycleFilter.positionKey
  );

  const selectedIndex = matchingPositionActions.findIndex((action) => action.id === lifecycleFilter.sourceActionId);

  if (selectedIndex === -1) {
    return { tradeActions: [], needsMoreData: true };
  }

  // Actions are sorted newest-first. Assign lifecycle segments walking oldest -> newest:
  // an executed close ends a segment, but trigger-order cancellations that directly follow
  // a close (e.g. auto-cancelled TP/SL orders) still belong to the closed lifecycle.
  const segmentIds = new Array<number>(matchingPositionActions.length);
  let segmentId = 0;
  let closeSeen = false;
  for (let index = matchingPositionActions.length - 1; index >= 0; index--) {
    const action = matchingPositionActions[index];

    if (closeSeen && !isPostCloseTailAction(action)) {
      segmentId += 1;
      closeSeen = false;
    }

    segmentIds[index] = segmentId;

    if (isPositionCloseAction(action)) {
      closeSeen = true;
    }
  }

  const sourceSegmentId = segmentIds[selectedIndex];
  const sliceActions = matchingPositionActions.filter((_, index) => segmentIds[index] === sourceSegmentId);

  // Segment 0 contains the oldest loaded action, so older pages may still hold rows of it.
  // When close rows lack positionSizeInUsd (legacy data), boundaries are undetectable and
  // fetching more pages cannot help, so stop requesting data instead of crawling everything.
  const needsMoreData = sourceSegmentId === 0 && !hasUndetectableCloseActions(matchingPositionActions);

  return { tradeActions: sliceActions, needsMoreData };
}

function isPositionCloseAction(action: PositionTradeAction) {
  return (
    action.eventName === TradeActionType.OrderExecuted &&
    action.positionSizeInUsd === 0n &&
    (isDecreaseOrderType(action.orderType) || isLiquidationOrderType(action.orderType))
  );
}

function isPostCloseTailAction(action: PositionTradeAction) {
  return (
    (action.eventName === TradeActionType.OrderCancelled || action.eventName === TradeActionType.OrderFrozen) &&
    isTriggerDecreaseOrderType(action.orderType)
  );
}

function hasUndetectableCloseActions(actions: PositionTradeAction[]) {
  return actions.some(
    (action) =>
      action.eventName === TradeActionType.OrderExecuted &&
      action.positionSizeInUsd === undefined &&
      (isDecreaseOrderType(action.orderType) || isLiquidationOrderType(action.orderType))
  );
}
