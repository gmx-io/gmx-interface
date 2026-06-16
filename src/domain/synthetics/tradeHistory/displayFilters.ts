import { OrderType } from "domain/synthetics/orders";
import { TradeAction, TradeActionType, isPositionTradeAction } from "sdk/utils/tradeHistory/types";

export type TradeHistoryActionFilter = {
  eventName?: TradeActionType;
  orderType?: OrderType[];
  isDepositOrWithdraw?: boolean;
  isTwap?: boolean;
};

export function filterLifecycleTradeActionsByDisplayFilters({
  tradeActions,
  fromTxTimestamp,
  toTxTimestamp,
  orderEventCombinations,
}: {
  tradeActions: TradeAction[] | undefined;
  fromTxTimestamp?: number;
  toTxTimestamp?: number;
  orderEventCombinations?: TradeHistoryActionFilter[];
}) {
  if (!tradeActions) {
    return tradeActions;
  }

  return tradeActions.filter((tradeAction) => {
    if (fromTxTimestamp !== undefined && tradeAction.timestamp < fromTxTimestamp) {
      return false;
    }

    if (toTxTimestamp !== undefined && tradeAction.timestamp > toTxTimestamp) {
      return false;
    }

    return matchesActionFilters(tradeAction, orderEventCombinations);
  });
}

function matchesActionFilters(tradeAction: TradeAction, orderEventCombinations: TradeHistoryActionFilter[] = []) {
  if (orderEventCombinations.length === 0) {
    return true;
  }

  return orderEventCombinations.some((combination) => {
    if (combination.eventName !== undefined && tradeAction.eventName !== combination.eventName) {
      return false;
    }

    if (combination.orderType?.length && !combination.orderType.includes(tradeAction.orderType)) {
      return false;
    }

    if (combination.isTwap !== undefined && Boolean(tradeAction.twapParams) !== combination.isTwap) {
      return false;
    }

    if (
      isPositionTradeAction(tradeAction) &&
      combination.isDepositOrWithdraw !== undefined &&
      [OrderType.MarketDecrease, OrderType.MarketIncrease].includes(tradeAction.orderType)
    ) {
      return combination.isDepositOrWithdraw ? tradeAction.sizeDeltaUsd === 0n : tradeAction.sizeDeltaUsd !== 0n;
    }

    return true;
  });
}
