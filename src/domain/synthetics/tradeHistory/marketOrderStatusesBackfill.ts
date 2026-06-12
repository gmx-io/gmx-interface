import { zeroAddress } from "viem";

import { OrderCreatedEventData, OrderStatus, OrderStatuses, PendingOrderData } from "context/SyntheticsEvents/types";
import { isSameAddress, isSameAddressArray } from "lib/addresses";
import { TradeAction as RawTradeAction } from "sdk/codegen/subsquid";
import { OrderType } from "sdk/utils/orders/types";
import { isMarketOrderType, isSwapOrderType } from "sdk/utils/orders/utils";
import { TradeActionType } from "sdk/utils/tradeHistory/types";

const MARKET_ORDER_BACKFILL_LOOKBACK_SECONDS = 60;
export const MARKET_ORDER_BACKFILL_PAGE_SIZE = 50;
export const MARKET_ORDER_BACKFILL_MAX_AGE_MS = 10 * 60 * 1000;

export type MarketOrderBackfillMatch = {
  pendingOrder: PendingOrderData;
  orderKey: string;
  eventName: TradeActionType.OrderExecuted | TradeActionType.OrderCancelled;
  transactionHash: string;
};

export function getIsPendingMarketOrderCreate(order: PendingOrderData) {
  return order.txnType === "create" && isMarketOrderType(order.orderType);
}

export function getMarketOrderBackfillParams(pendingOrders: PendingOrderData[]) {
  const orders = pendingOrders.filter(getIsPendingMarketOrderCreate);

  if (orders.length === 0) {
    return undefined;
  }

  const getUniqueOrderTypes = (filtered: PendingOrderData[]) =>
    Array.from(new Set(filtered.map((order) => order.orderType)));

  // sizeDeltaUsd == 0 on a position market order means a collateral deposit or withdrawal,
  // which the trade history filters require to be requested explicitly
  const orderTypes = getUniqueOrderTypes(
    orders.filter((order) => order.sizeDeltaUsd !== 0n || isSwapOrderType(order.orderType))
  );
  const depositOrWithdrawOrderTypes = getUniqueOrderTypes(
    orders.filter((order) => order.sizeDeltaUsd === 0n && !isSwapOrderType(order.orderType))
  );

  const orderEventCombinations = [TradeActionType.OrderExecuted, TradeActionType.OrderCancelled].flatMap(
    (eventName) => {
      const combinations: { eventName: TradeActionType; orderType: OrderType[]; isDepositOrWithdraw?: boolean }[] = [];

      if (orderTypes.length > 0) {
        combinations.push({ eventName, orderType: orderTypes });
      }

      if (depositOrWithdrawOrderTypes.length > 0) {
        combinations.push({ eventName, orderType: depositOrWithdrawOrderTypes, isDepositOrWithdraw: true });
      }

      return combinations;
    }
  );

  const createdAt = Math.min(...orders.map((order) => order.createdAt));

  return {
    account: orders[0].account,
    fromTxTimestamp: Math.max(0, Math.floor(createdAt / 1000) - MARKET_ORDER_BACKFILL_LOOKBACK_SECONDS),
    orderEventCombinations,
  };
}

export function getMarketOrderBackfillMatches(
  pendingOrders: PendingOrderData[],
  rawActions: RawTradeAction[] | undefined,
  orderStatuses: OrderStatuses
): MarketOrderBackfillMatch[] {
  if (!rawActions?.length) {
    return [];
  }

  const usedActionIds = new Set<string>();
  const matches: MarketOrderBackfillMatch[] = [];

  pendingOrders.filter(getIsPendingMarketOrderCreate).forEach((pendingOrder) => {
    const action = rawActions.find(
      (rawAction) =>
        !usedActionIds.has(rawAction.id) &&
        !getIsOrderStatusResolved(orderStatuses[rawAction.orderKey]) &&
        getIsRawTradeActionMatchingPendingOrder(rawAction, pendingOrder)
    );

    if (!action) {
      return;
    }

    usedActionIds.add(action.id);
    matches.push({
      pendingOrder,
      orderKey: action.orderKey,
      eventName: action.eventName as MarketOrderBackfillMatch["eventName"],
      transactionHash: action.transactionHash,
    });
  });

  return matches;
}

function getIsOrderStatusResolved(orderStatus: OrderStatus | undefined) {
  return Boolean(orderStatus?.executedTxnHash ?? orderStatus?.cancelledTxnHash);
}

function getIsRawTradeActionMatchingPendingOrder(rawAction: RawTradeAction, pendingOrder: PendingOrderData) {
  const isBackfilledEvent =
    rawAction.eventName === TradeActionType.OrderExecuted || rawAction.eventName === TradeActionType.OrderCancelled;

  const isAfterSubmission =
    rawAction.timestamp + MARKET_ORDER_BACKFILL_LOOKBACK_SECONDS >= Math.floor(pendingOrder.createdAt / 1000);

  const isAmountsMatch =
    BigInt(rawAction.sizeDeltaUsd ?? 0) === pendingOrder.sizeDeltaUsd &&
    // with an external swap the on-chain collateral amount differs from the requested one
    (pendingOrder.externalSwapQuote !== undefined ||
      BigInt(rawAction.initialCollateralDeltaAmount ?? 0) === pendingOrder.initialCollateralDeltaAmount) &&
    (!isSwapOrderType(pendingOrder.orderType) ||
      BigInt(rawAction.minOutputAmount ?? 0) === pendingOrder.minOutputAmount);

  return (
    isBackfilledEvent &&
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
