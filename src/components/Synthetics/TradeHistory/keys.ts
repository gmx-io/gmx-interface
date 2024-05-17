import { i18n, type MessageDescriptor } from "@lingui/core";
import { msg, t } from "@lingui/macro";

import { isLimitOrderType, OrderType } from "domain/synthetics/orders";
import { getTriggerNameByOrderType } from "domain/synthetics/positions";
import type { TradeActionType } from "domain/synthetics/tradeHistory";
import { mustNeverExist } from "lib/types";

import { getOrderActionText } from "./TradeHistoryRow/utils/shared";

type OrderTypes = keyof typeof OrderType;

export const actionTextMapBase: Partial<
  Record<`${OrderTypes | "Deposit" | "Withdraw"}-${TradeActionType}`, MessageDescriptor>
> = {
  "MarketSwap-OrderCreated": msg`Request Market Swap`,
  "MarketSwap-OrderExecuted": msg`Execute Market Swap`,
  "MarketSwap-OrderCancelled": msg`Failed Market Swap`,

  "LimitSwap-OrderCreated": msg`Create Limit Swap`,
  "LimitSwap-OrderExecuted": msg`Execute Limit Swap`,
  "LimitSwap-OrderCancelled": msg`Cancel Limit Swap`,
  "LimitSwap-OrderUpdated": msg`Update Limit Swap`,
  "LimitSwap-OrderFrozen": msg`Failed Limit Swap`,

  "MarketIncrease-OrderCreated": msg`Request Market Increase`,
  "MarketIncrease-OrderExecuted": msg`Market Increase`,
  "MarketIncrease-OrderCancelled": msg`Failed Market Increase`,

  "LimitIncrease-OrderCreated": msg`Create Limit Order`,
  "LimitIncrease-OrderExecuted": msg`Execute Limit Order`,
  "LimitIncrease-OrderCancelled": msg`Cancel Limit Order`,
  "LimitIncrease-OrderUpdated": msg`Update Limit Order`,
  "LimitIncrease-OrderFrozen": msg`Failed Limit Order`,

  "MarketDecrease-OrderCreated": msg`Request Market Decrease`,
  "MarketDecrease-OrderExecuted": msg`Market Decrease`,
  "MarketDecrease-OrderCancelled": msg`Failed Market Decrease`,

  "LimitDecrease-OrderCreated": msg`Create Take-Profit Order`,
  "LimitDecrease-OrderExecuted": msg`Execute Take-Profit Order`,
  "LimitDecrease-OrderCancelled": msg`Cancel Take-Profit Order`,
  "LimitDecrease-OrderUpdated": msg`Update Take-Profit Order`,
  "LimitDecrease-OrderFrozen": msg`Failed Take-Profit Order`,

  "StopLossDecrease-OrderCreated": msg`Create Stop-Loss Order`,
  "StopLossDecrease-OrderExecuted": msg`Execute Stop-Loss Order`,
  "StopLossDecrease-OrderCancelled": msg`Cancel Stop-Loss Order`,
  "StopLossDecrease-OrderUpdated": msg`Update Stop-Loss Order`,
  "StopLossDecrease-OrderFrozen": msg`Failed Stop-Loss Order`,

  "Liquidation-OrderExecuted": msg`Liquidated`,
};

export const actionTextMap: Partial<
  Record<`${OrderTypes | "Deposit" | "Withdraw"}-${TradeActionType}`, MessageDescriptor>
> = {
  ...actionTextMapBase,

  "Deposit-OrderCreated": msg`Request Deposit`,
  "Deposit-OrderExecuted": msg`Deposit`,
  "Deposit-OrderCancelled": msg`Failed Deposit`,

  "Withdraw-OrderCreated": msg`Request Withdraw`,
  "Withdraw-OrderExecuted": msg`Withdraw`,
  "Withdraw-OrderCancelled": msg`Failed Withdraw`,
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
