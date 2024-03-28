import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";
import { isLimitOrderType, OrderType } from "domain/synthetics/orders";
import { getTriggerNameByOrderType } from "domain/synthetics/positions";
import type { TradeActionType } from "domain/synthetics/tradeHistory";
import { mustNeverExist } from "lib/types";
import { getOrderActionText } from "./TradeHistoryRow/utils/shared";

type OrderTypes = keyof typeof OrderType;

export const actionTextMapBase: Partial<Record<`${OrderTypes | "Deposit" | "Withdraw"}-${TradeActionType}`, string>> = {
  "MarketSwap-OrderCreated": /*i18n*/ "Request Market Swap",
  "MarketSwap-OrderExecuted": /*i18n*/ "Execute Market Swap",
  "MarketSwap-OrderCancelled": /*i18n*/ "Failed Market Swap",

  "LimitSwap-OrderCreated": /*i18n*/ "Create Limit Swap",
  "LimitSwap-OrderExecuted": /*i18n*/ "Execute Limit Swap",
  "LimitSwap-OrderCancelled": /*i18n*/ "Cancel Limit Swap",
  "LimitSwap-OrderUpdated": /*i18n*/ "Update Limit Swap",
  "LimitSwap-OrderFrozen": /*i18n*/ "Failed Limit Swap",

  "MarketIncrease-OrderCreated": /*i18n*/ "Request Market Increase",
  "MarketIncrease-OrderExecuted": /*i18n*/ "Market Increase",
  "MarketIncrease-OrderCancelled": /*i18n*/ "Failed Market Increase",

  "LimitIncrease-OrderCreated": /*i18n*/ "Create Limit Order",
  "LimitIncrease-OrderExecuted": /*i18n*/ "Execute Limit Order",
  "LimitIncrease-OrderCancelled": /*i18n*/ "Cancel Limit Order",
  "LimitIncrease-OrderUpdated": /*i18n*/ "Update Limit Order",
  "LimitIncrease-OrderFrozen": /*i18n*/ "Failed Limit Order",

  "MarketDecrease-OrderCreated": /*i18n*/ "Request Market Decrease",
  "MarketDecrease-OrderExecuted": /*i18n*/ "Market Decrease",
  "MarketDecrease-OrderCancelled": /*i18n*/ "Failed Market Decrease",

  "LimitDecrease-OrderCreated": /*i18n*/ "Create Take-Profit Order",
  "LimitDecrease-OrderExecuted": /*i18n*/ "Execute Take-Profit Order",
  "LimitDecrease-OrderCancelled": /*i18n*/ "Cancel Take-Profit Order",
  "LimitDecrease-OrderUpdated": /*i18n*/ "Update Take-Profit Order",
  "LimitDecrease-OrderFrozen": /*i18n*/ "Failed Take-Profit Order",

  "StopLossDecrease-OrderCreated": /*i18n*/ "Create Stop-Loss Order",
  "StopLossDecrease-OrderExecuted": /*i18n*/ "Execute Stop-Loss Order",
  "StopLossDecrease-OrderCancelled": /*i18n*/ "Cancel Stop-Loss Order",
  "StopLossDecrease-OrderUpdated": /*i18n*/ "Update Stop-Loss Order",
  "StopLossDecrease-OrderFrozen": /*i18n*/ "Failed Stop-Loss Order",

  "Liquidation-OrderExecuted": /*i18n*/ "Liquidated",
};

export const actionTextMap: Partial<Record<`${OrderTypes | "Deposit" | "Withdraw"}-${TradeActionType}`, string>> = {
  ...actionTextMapBase,

  "Deposit-OrderCreated": /*i18n*/ "Request Deposit",
  "Deposit-OrderExecuted": /*i18n*/ "Deposit",
  "Deposit-OrderCancelled": /*i18n*/ "Failed Deposit",

  "Withdraw-OrderCreated": /*i18n*/ "Request Withdraw",
  "Withdraw-OrderExecuted": /*i18n*/ "Withdraw",
  "Withdraw-OrderCancelled": /*i18n*/ "Failed Withdraw",
};

export function orderTypeToKey(orderType: OrderType): keyof typeof OrderType {
  switch (orderType) {
    case OrderType.MarketSwap:
      return "MarketSwap";
    case OrderType.LimitSwap:
      return "LimitSwap";
    case OrderType.MarketIncrease:
      return "MarketIncrease";
    case OrderType.LimitIncrease:
      return "LimitIncrease";
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

export function getActionTitle(orderType: OrderType, eventName: TradeActionType) {
  const title = actionTextMap[`${orderTypeToKey(orderType)}-${eventName}`];

  if (title) {
    return i18n._(title);
  }

  const fallbackOrderTypeName = isLimitOrderType(orderType) ? t`Limit` : getTriggerNameByOrderType(orderType);

  return `${getOrderActionText(eventName)} ${fallbackOrderTypeName}`;
}
