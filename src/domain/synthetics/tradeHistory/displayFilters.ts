import { OrderType, isLimitOrderType, isSwapOrderType, isTriggerDecreaseOrderType } from "domain/synthetics/orders";
import { PositionTradeAction, TradeAction, TradeActionType, isPositionTradeAction } from "sdk/utils/tradeHistory/types";

export type TradeHistoryActionFilter = {
  eventName?: TradeActionType;
  orderType?: OrderType[];
  isDepositOrWithdraw?: boolean;
  isTwap?: boolean;
};

export type TradeHistoryMarketFilter = {
  marketAddress: string | "any";
  direction: "long" | "short" | "swap" | "any";
  collateralAddress?: string;
};

export function filterTradeActionsByDisplayFilters({
  tradeActions,
  fromTxTimestamp,
  toTxTimestamp,
  marketsDirectionsFilter,
  orderEventCombinations,
}: {
  tradeActions: TradeAction[] | undefined;
  fromTxTimestamp?: number;
  toTxTimestamp?: number;
  marketsDirectionsFilter?: TradeHistoryMarketFilter[];
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

    return (
      matchesMarketFilters(tradeAction, marketsDirectionsFilter) &&
      matchesActionFilters(tradeAction, orderEventCombinations)
    );
  });
}

function matchesMarketFilters(tradeAction: TradeAction, marketsDirectionsFilter: TradeHistoryMarketFilter[] = []) {
  if (marketsDirectionsFilter.length === 0) {
    return true;
  }

  // Mirrors the server-side where clause: pure-direction filters and defined-market filters
  // are AND-ed groups, each matching via OR.
  const pureDirectionFilters = marketsDirectionsFilter.filter(
    (filter) => filter.direction !== "any" && filter.marketAddress === "any"
  );
  const definedMarketFilters = marketsDirectionsFilter.filter((filter) => filter.marketAddress !== "any");

  const matchesPureDirection =
    pureDirectionFilters.length === 0 ||
    pureDirectionFilters.some((filter) => matchesPureDirectionFilter(tradeAction, filter));
  const matchesDefinedMarket =
    definedMarketFilters.length === 0 ||
    definedMarketFilters.some((filter) => matchesDefinedMarketFilter(tradeAction, filter));

  return matchesPureDirection && matchesDefinedMarket;
}

function matchesPureDirectionFilter(tradeAction: TradeAction, filter: TradeHistoryMarketFilter) {
  const isSwap = isSwapOrderType(tradeAction.orderType);

  if (filter.direction === "swap") {
    return isSwap;
  }

  return !isSwap && isPositionTradeAction(tradeAction) && tradeAction.isLong === (filter.direction === "long");
}

function matchesDefinedMarketFilter(tradeAction: TradeAction, filter: TradeHistoryMarketFilter) {
  if (isSwapOrderType(tradeAction.orderType)) {
    return (
      (filter.direction === "any" || filter.direction === "swap") && tradeAction.swapPath.includes(filter.marketAddress)
    );
  }

  if (filter.direction === "swap" || !isPositionTradeAction(tradeAction)) {
    return false;
  }

  if (tradeAction.marketAddress !== filter.marketAddress) {
    return false;
  }

  if (filter.direction !== "any" && tradeAction.isLong !== (filter.direction === "long")) {
    return false;
  }

  return matchesCollateralFilter(tradeAction, filter.collateralAddress);
}

function matchesCollateralFilter(tradeAction: PositionTradeAction, collateralAddress: string | undefined) {
  if (!collateralAddress) {
    return true;
  }

  // Mirrors processRawTradeActions: only limit orders (matched by swap output) and
  // trigger-decrease orders (matched by initial collateral) are collateral-constrained.
  if (isLimitOrderType(tradeAction.orderType)) {
    return tradeAction.targetCollateralToken.address === collateralAddress;
  }

  if (isTriggerDecreaseOrderType(tradeAction.orderType)) {
    return tradeAction.initialCollateralTokenAddress === collateralAddress;
  }

  return true;
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
