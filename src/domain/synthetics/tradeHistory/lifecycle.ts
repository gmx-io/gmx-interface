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

  // Date/action filters can hide lifecycle boundaries.
  return {
    fromTxTimestamp: undefined,
    toTxTimestamp: undefined,
    marketsDirectionsFilter,
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

  // Walk oldest -> newest; post-close trigger cancellations stay in the closed segment.
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

  // Segment 0 can continue on older pages; legacy closes lack size boundaries.
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
