import { t } from "@lingui/macro";
import { TradeActionType } from "domain/synthetics/tradeHistory";
import { BigNumber } from "ethers";

export function getOrderActionText(eventName: TradeActionType) {
  let actionText = "";

  if (eventName === TradeActionType.OrderCreated) {
    actionText = t`Create`;
  }

  if (eventName === TradeActionType.OrderCancelled) {
    actionText = t`Cancel`;
  }

  if (eventName === TradeActionType.OrderExecuted) {
    actionText = t`Execute`;
  }

  if (eventName === TradeActionType.OrderUpdated) {
    actionText = t`Update`;
  }

  if (eventName === TradeActionType.OrderFrozen) {
    actionText = t`Freeze`;
  }

  return actionText;
}
export type TooltipState = "success" | "error" | undefined;
export type TooltipString =
  | string
  | {
      text: string;
      state?: TooltipState;
    };

export function numberToState(value: BigNumber | undefined): TooltipState {
  if (!value) {
    return undefined;
  }

  if (value.gt(0)) {
    return "success";
  }
  if (value.lt(0)) {
    return "error";
  }

  return undefined;
}
export type Line = TooltipString | TooltipString[];
export type TooltipContent = Line[];
export function lines(...args: TooltipContent): TooltipContent {
  return args;
}

export type RowDetails = {
  action: string;
  timestamp: string;
  market: string;
  fullMarket?: string;
  size: string;
  price: string;
  priceComment: TooltipContent;
  //#region CSV fields
  executionPrice?: string;
  acceptablePrice?: string;
  priceImpact?: string;
  triggerPrice?: string;
  //#endregion
};
