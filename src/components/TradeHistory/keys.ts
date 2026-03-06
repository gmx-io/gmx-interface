import { i18n, type MessageDescriptor } from "@lingui/core";
import { msg, t } from "@lingui/macro";

import { isLimitOrderType, isMarketOrderType, isSwapOrderType, OrderType } from "domain/synthetics/orders";
import { getNameByOrderType } from "domain/synthetics/positions";
import { TradeActionType } from "domain/synthetics/tradeHistory";
import { mustNeverExist } from "lib/types";
import { USER_INITIATED_CANCEL } from "sdk/utils/tradeHistory/types";

import { getOrderActionText } from "./TradeHistoryRow/utils/shared";

type OrderTypes = keyof typeof OrderType;

const actionTextMapBase: Partial<
  Record<`${OrderTypes | "Deposit" | "Withdraw" | "Twap" | "TwapSwap"}-${TradeActionType}`, MessageDescriptor>
> = {
  "MarketSwap-OrderCreated": msg`Request Market Swap`,
  "MarketSwap-OrderExecuted": msg`Execute Market Swap`,
  "MarketSwap-OrderCancelled": msg`Failed Market Swap`,

  "LimitSwap-OrderCreated": msg`Create Limit Swap`,
  "LimitSwap-OrderExecuted": msg`Execute Limit Swap`,
  "LimitSwap-OrderCancelled": msg`Cancel Limit Swap`,
  "LimitSwap-OrderUpdated": msg`Update Limit Swap`,
  "LimitSwap-OrderFrozen": msg`Failed Limit Swap`,

  "Twap-OrderCreated": msg`Create TWAP`,
  "Twap-OrderExecuted": msg`Execute TWAP part`,
  "Twap-OrderCancelled": msg`Cancel TWAP`,
  "Twap-OrderUpdated": msg`Update TWAP part`,
  "Twap-OrderFrozen": msg`Failed TWAP part`,

  "TwapSwap-OrderCreated": msg`Create TWAP Swap`,
  "TwapSwap-OrderExecuted": msg`Execute TWAP Swap part`,
  "TwapSwap-OrderCancelled": msg`Cancel TWAP Swap`,
  "TwapSwap-OrderUpdated": msg`Update TWAP Swap part`,
  "TwapSwap-OrderFrozen": msg`Failed TWAP Swap part`,

  "MarketIncrease-OrderCreated": msg`Request Market Increase`,
  "MarketIncrease-OrderExecuted": msg`Market Increase`,
  "MarketIncrease-OrderCancelled": msg`Failed Market Increase`,

  "LimitIncrease-OrderCreated": msg`Create Limit`,
  "LimitIncrease-OrderExecuted": msg`Execute Limit`,
  "LimitIncrease-OrderCancelled": msg`Cancel Limit`,
  "LimitIncrease-OrderUpdated": msg`Update Limit`,
  "LimitIncrease-OrderFrozen": msg`Failed Limit`,

  "StopIncrease-OrderCreated": msg`Create Stop Market`,
  "StopIncrease-OrderExecuted": msg`Execute Stop Market`,
  "StopIncrease-OrderCancelled": msg`Cancel Stop Market`,
  "StopIncrease-OrderUpdated": msg`Update Stop Market`,
  "StopIncrease-OrderFrozen": msg`Failed Stop Market`,

  "MarketDecrease-OrderCreated": msg`Request Market Decrease`,
  "MarketDecrease-OrderExecuted": msg`Market Decrease`,
  "MarketDecrease-OrderCancelled": msg`Failed Market Decrease`,

  "LimitDecrease-OrderCreated": msg`Create Take-Profit`,
  "LimitDecrease-OrderExecuted": msg`Execute Take-Profit`,
  "LimitDecrease-OrderCancelled": msg`Cancel Take-Profit`,
  "LimitDecrease-OrderUpdated": msg`Update Take-Profit`,
  "LimitDecrease-OrderFrozen": msg`Failed Take-Profit`,

  "StopLossDecrease-OrderCreated": msg`Create Stop-Loss`,
  "StopLossDecrease-OrderExecuted": msg`Execute Stop-Loss`,
  "StopLossDecrease-OrderCancelled": msg`Cancel Stop-Loss`,
  "StopLossDecrease-OrderUpdated": msg`Update Stop-Loss`,
  "StopLossDecrease-OrderFrozen": msg`Failed Stop-Loss`,

  "Liquidation-OrderExecuted": msg`Liquidated`,
};

/**
 * Action text overrides for expired market order cancellations.
 * In v2.2c, keepers can cancel market orders after requestExpirationTime has passed.
 * When reason === "USER_INITIATED_CANCEL" on a market order cancel, it means the request
 * expired rather than execution failed.
 */
export const expiredActionTextMap: Partial<Record<string, MessageDescriptor>> = {
  "MarketSwap-OrderCancelled": msg`Expired Market Swap`,
  "MarketIncrease-OrderCancelled": msg`Expired Market Increase`,
  "MarketDecrease-OrderCancelled": msg`Expired Market Decrease`,
  "Deposit-OrderCancelled": msg`Expired deposit`,
  "Withdraw-OrderCancelled": msg`Expired withdraw`,
};

export const actionTextMap: Partial<
  Record<`${OrderTypes | "Deposit" | "Withdraw" | "Twap" | "TwapSwap"}-${TradeActionType}`, MessageDescriptor>
> = {
  ...actionTextMapBase,

  "Deposit-OrderCreated": msg`Request deposit`,
  "Deposit-OrderExecuted": msg`Deposit`,
  "Deposit-OrderCancelled": msg`Failed deposit`,

  "Withdraw-OrderCreated": msg`Request withdraw`,
  "Withdraw-OrderExecuted": msg`Withdraw`,
  "Withdraw-OrderCancelled": msg`Failed withdraw`,
};

function orderTypeToKey(orderType: OrderType): keyof typeof OrderType {
  switch (orderType) {
    case OrderType.MarketSwap:
      return "MarketSwap";
    case OrderType.LimitSwap:
      return "LimitSwap";
    case OrderType.MarketIncrease:
      return "MarketIncrease";
    case OrderType.LimitIncrease:
      return "LimitIncrease";
    case OrderType.StopIncrease:
      return "StopIncrease";
    case OrderType.MarketDecrease:
      return "MarketDecrease";
    case OrderType.LimitDecrease:
      return "LimitDecrease";
    case OrderType.StopLossDecrease:
      return "StopLossDecrease";
    case OrderType.Liquidation:
      return "Liquidation";
    default:
      return mustNeverExist(orderType);
  }
}

export function getActionTitle(orderType: OrderType, eventName: TradeActionType, isTwap: boolean, reason?: string) {
  const key = isTwap
    ? `Twap${isSwapOrderType(orderType) ? "Swap" : ""}-${eventName}`
    : `${orderTypeToKey(orderType)}-${eventName}`;

  // For market order cancellations with USER_INITIATED_CANCEL reason, show "Expired" instead of "Failed".
  // In v2.2c, keepers can cancel market orders after requestExpirationTime. When the reason is
  // USER_INITIATED_CANCEL on a market order cancel, it indicates expiration rather than execution failure.
  if (
    reason === USER_INITIATED_CANCEL &&
    eventName === TradeActionType.OrderCancelled &&
    isMarketOrderType(orderType)
  ) {
    const expiredTitle = expiredActionTextMap[key];
    if (expiredTitle) {
      return i18n._(expiredTitle);
    }
  }

  const title = actionTextMap[key];

  if (title) {
    return i18n._(title);
  }

  const fallbackOrderTypeName = isLimitOrderType(orderType) ? t`Limit` : getNameByOrderType(orderType, isTwap);

  return `${getOrderActionText(eventName)} ${fallbackOrderTypeName}`;
}
