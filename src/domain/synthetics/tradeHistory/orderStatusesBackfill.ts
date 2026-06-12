import { zeroAddress } from "viem";

import { OrderCreatedEventData, OrderStatus, OrderStatuses, PendingOrderData } from "context/SyntheticsEvents/types";
import { isSameAddress, isSameAddressArray } from "lib/addresses";
import { TradeAction as RawTradeAction } from "sdk/codegen/subsquid";
import { OrderType } from "sdk/utils/orders/types";
import { isMarketOrderType, isSwapOrderType } from "sdk/utils/orders/utils";
import { TradeActionType } from "sdk/utils/tradeHistory/types";

const ORDER_BACKFILL_LOOKBACK_SECONDS = 60;
export const ORDER_BACKFILL_PAGE_SIZE = 50;
export const ORDER_BACKFILL_MAX_AGE_MS = 10 * 60 * 1000;

type OrderBackfillEventName =
  | TradeActionType.OrderCreated
  | TradeActionType.OrderExecuted
  | TradeActionType.OrderUpdated
  | TradeActionType.OrderCancelled;

export const ORDER_STATUS_TXN_HASH_FIELD_BY_EVENT = {
  [TradeActionType.OrderCreated]: "createdTxnHash",
  [TradeActionType.OrderExecuted]: "executedTxnHash",
  [TradeActionType.OrderUpdated]: "updatedTxnHash",
  [TradeActionType.OrderCancelled]: "cancelledTxnHash",
} as const satisfies Record<OrderBackfillEventName, keyof OrderStatus>;

export type OrderBackfillMatch = {
  pendingOrder: PendingOrderData;
  orderKey: string;
  eventName: OrderBackfillEventName;
  transactionHash: string;
};

export function getIsPendingOrderBackfillable(order: PendingOrderData) {
  // TWAP parts need twapGroupId-aware queries and matching, which is not supported here
  if (order.isTwap) {
    return false;
  }

  return order.txnType === "create" || order.orderKey !== undefined;
}

function getExpectedEventNames(order: PendingOrderData): OrderBackfillEventName[] {
  if (order.txnType === "update") {
    return [TradeActionType.OrderUpdated];
  }

  if (order.txnType === "cancel") {
    return [TradeActionType.OrderCancelled];
  }

  // The trade history is append-only, so for non-market creates the created
  // action is queryable even after the order executes or is cancelled
  return isMarketOrderType(order.orderType)
    ? [TradeActionType.OrderExecuted, TradeActionType.OrderCancelled]
    : [TradeActionType.OrderCreated];
}

export function getOrderBackfillParams(pendingOrders: PendingOrderData[]) {
  const orders = pendingOrders.filter(getIsPendingOrderBackfillable);

  if (orders.length === 0) {
    return undefined;
  }

  const combinationsByKey = new Map<
    string,
    { eventName: TradeActionType; isDepositOrWithdraw: boolean; orderTypes: Set<OrderType> }
  >();

  orders.forEach((order) => {
    // sizeDeltaUsd == 0 on a position market order means a collateral deposit or
    // withdrawal, which the trade history filters require to be requested explicitly
    const isDepositOrWithdraw =
      isMarketOrderType(order.orderType) && !isSwapOrderType(order.orderType) && order.sizeDeltaUsd === 0n;

    getExpectedEventNames(order).forEach((eventName) => {
      const key = `${eventName}:${isDepositOrWithdraw}`;
      const combination = combinationsByKey.get(key) ?? { eventName, isDepositOrWithdraw, orderTypes: new Set() };

      combination.orderTypes.add(order.orderType);
      combinationsByKey.set(key, combination);
    });
  });

  const orderEventCombinations = Array.from(combinationsByKey.values()).map(
    ({ eventName, isDepositOrWithdraw, orderTypes }) => ({
      eventName,
      orderType: Array.from(orderTypes),
      ...(isDepositOrWithdraw ? { isDepositOrWithdraw } : {}),
    })
  );

  const createdAt = Math.min(...orders.map((order) => order.createdAt));

  return {
    account: orders[0].account,
    fromTxTimestamp: Math.max(0, Math.floor(createdAt / 1000) - ORDER_BACKFILL_LOOKBACK_SECONDS),
    orderEventCombinations,
  };
}

export function getOrderBackfillMatches(
  pendingOrders: PendingOrderData[],
  rawActions: RawTradeAction[] | undefined,
  orderStatuses: OrderStatuses
): OrderBackfillMatch[] {
  if (!rawActions?.length) {
    return [];
  }

  const usedActionIds = new Set<string>();
  const matches: OrderBackfillMatch[] = [];

  pendingOrders.filter(getIsPendingOrderBackfillable).forEach((pendingOrder) => {
    const action = rawActions.find(
      (rawAction) =>
        !usedActionIds.has(rawAction.id) &&
        !getIsActionAlreadyApplied(rawAction, orderStatuses[rawAction.orderKey]) &&
        getIsRawTradeActionMatchingPendingOrder(rawAction, pendingOrder)
    );

    if (!action) {
      return;
    }

    usedActionIds.add(action.id);
    matches.push({
      pendingOrder,
      orderKey: action.orderKey,
      eventName: action.eventName as OrderBackfillEventName,
      transactionHash: action.transactionHash,
    });
  });

  return matches;
}

function getIsActionAlreadyApplied(rawAction: RawTradeAction, orderStatus: OrderStatus | undefined) {
  const txnHashField = ORDER_STATUS_TXN_HASH_FIELD_BY_EVENT[rawAction.eventName as OrderBackfillEventName];

  return txnHashField !== undefined && Boolean(orderStatus?.[txnHashField]);
}

function getIsRawTradeActionMatchingPendingOrder(rawAction: RawTradeAction, pendingOrder: PendingOrderData) {
  if (!getExpectedEventNames(pendingOrder).includes(rawAction.eventName as OrderBackfillEventName)) {
    return false;
  }

  // Update and cancel transactions know the on-chain order key, so match exactly
  if (pendingOrder.txnType !== "create") {
    return pendingOrder.orderKey !== undefined && rawAction.orderKey === pendingOrder.orderKey;
  }

  const isAfterSubmission =
    rawAction.timestamp + ORDER_BACKFILL_LOOKBACK_SECONDS >= Math.floor(pendingOrder.createdAt / 1000);

  const isAmountsMatch =
    BigInt(rawAction.sizeDeltaUsd ?? 0) === pendingOrder.sizeDeltaUsd &&
    // with an external swap the on-chain collateral amount differs from the requested one
    (pendingOrder.externalSwapQuote !== undefined ||
      BigInt(rawAction.initialCollateralDeltaAmount ?? 0) === pendingOrder.initialCollateralDeltaAmount) &&
    (!isSwapOrderType(pendingOrder.orderType) ||
      BigInt(rawAction.minOutputAmount ?? 0) === pendingOrder.minOutputAmount) &&
    (isMarketOrderType(pendingOrder.orderType) || BigInt(rawAction.triggerPrice ?? 0) === pendingOrder.triggerPrice);

  return (
    isAfterSubmission &&
    isAmountsMatch &&
    rawAction.orderType === pendingOrder.orderType &&
    (rawAction.isLong ?? pendingOrder.isLong) === pendingOrder.isLong &&
    (rawAction.shouldUnwrapNativeToken ?? false) === pendingOrder.shouldUnwrapNativeToken &&
    isSameAddress(rawAction.account, pendingOrder.account) &&
    isSameAddress(rawAction.marketAddress ?? zeroAddress, pendingOrder.marketAddress) &&
    isSameAddress(rawAction.initialCollateralTokenAddress, pendingOrder.initialCollateralTokenAddress) &&
    isSameAddressArray(rawAction.swapPath, pendingOrder.swapPath)
  );
}

export function getOrderCreatedDataFromPendingOrder(
  pendingOrder: PendingOrderData,
  orderKey: string
): OrderCreatedEventData {
  return {
    key: orderKey,
    account: pendingOrder.account,
    receiver: pendingOrder.account,
    callbackContract: zeroAddress,
    marketAddress: pendingOrder.marketAddress,
    initialCollateralTokenAddress: pendingOrder.initialCollateralTokenAddress,
    swapPath: pendingOrder.swapPath,
    sizeDeltaUsd: pendingOrder.sizeDeltaUsd,
    initialCollateralDeltaAmount: pendingOrder.initialCollateralDeltaAmount,
    contractTriggerPrice: pendingOrder.triggerPrice,
    contractAcceptablePrice: pendingOrder.acceptablePrice,
    executionFee: 0n,
    callbackGasLimit: 0n,
    minOutputAmount: pendingOrder.minOutputAmount,
    updatedAtBlock: 0n,
    orderType: pendingOrder.orderType,
    isLong: pendingOrder.isLong,
    shouldUnwrapNativeToken: pendingOrder.shouldUnwrapNativeToken,
    isFrozen: false,
    uiFeeReceiver: zeroAddress,
    externalSwapQuote: undefined,
    isTwap: pendingOrder.isTwap,
  };
}
