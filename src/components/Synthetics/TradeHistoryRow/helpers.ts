import { t } from "@lingui/macro";
import {
  isIncreaseOrderType,
  isLimitOrderType,
  isLiquidationOrderType,
  isMarketOrderType,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import { formatAcceptablePrice } from "domain/synthetics/positions";
import { getTriggerThresholdType } from "domain/synthetics/trade";
import { PositionTradeAction, TradeAction, TradeActionType } from "domain/synthetics/tradeHistory";
import { formatTokenAmount, formatUsd } from "lib/numbers";

export function getOrderActionText(tradeAction: TradeAction) {
  let actionText = "";

  if (tradeAction.eventName === TradeActionType.OrderCreated) {
    actionText = t`Create`;
  }

  if (tradeAction.eventName === TradeActionType.OrderCancelled) {
    actionText = t`Cancel`;
  }

  if (tradeAction.eventName === TradeActionType.OrderExecuted) {
    actionText = t`Execute`;
  }

  if (tradeAction.eventName === TradeActionType.OrderUpdated) {
    actionText = t`Update`;
  }

  if (tradeAction.eventName === TradeActionType.OrderFrozen) {
    actionText = t`Freeze`;
  }

  return actionText;
}

export const formatPositionOrderMessage = (tradeAction: PositionTradeAction) => {
  const indexToken = tradeAction.indexToken;
  const priceDecimals = tradeAction.indexToken.priceDecimals;
  const collateralToken = tradeAction.initialCollateralToken;
  const sizeDeltaUsd = tradeAction.sizeDeltaUsd;
  const collateralDeltaAmount = tradeAction.initialCollateralDeltaAmount;

  const increaseText = isIncreaseOrderType(tradeAction.orderType!) ? t`Increase` : t`Decrease`;
  const longText = tradeAction.isLong ? t`Long` : t`Short`;
  const positionText = `${longText} ${indexToken.symbol}`;
  const sizeDeltaText = `${isIncreaseOrderType(tradeAction.orderType!) ? "+" : "-"}${formatUsd(sizeDeltaUsd)}`;

  if (isLimitOrderType(tradeAction.orderType) || isTriggerDecreaseOrderType(tradeAction.orderType)) {
    const triggerPrice = tradeAction.triggerPrice;
    const executionPrice = tradeAction.executionPrice;
    const pricePrefix = getTriggerThresholdType(tradeAction.orderType!, tradeAction.isLong!);
    const actionText = getOrderActionText(tradeAction);

    if (tradeAction.eventName === TradeActionType.OrderExecuted) {
      return t`Execute Order: ${increaseText} ${positionText} ${sizeDeltaText}, ${indexToken.symbol} Price: ${formatUsd(
        executionPrice,
        { displayDecimals: priceDecimals }
      )}`;
    }

    return t`${actionText} Order: ${increaseText} ${positionText} ${sizeDeltaText}, ${
      indexToken.symbol
    } Price: ${pricePrefix} ${formatUsd(triggerPrice, { displayDecimals: priceDecimals })}`;
  }

  if (isMarketOrderType(tradeAction.orderType)) {
    let actionText = {
      [TradeActionType.OrderCreated]: t`Request`,
      [TradeActionType.OrderExecuted]: "",
      [TradeActionType.OrderCancelled]: t`Cancel`,
      [TradeActionType.OrderUpdated]: t`Update`,
      [TradeActionType.OrderFrozen]: t`Freeze`,
    }[tradeAction.eventName!];

    if (sizeDeltaUsd?.gt(0)) {
      const pricePrefix = tradeAction.eventName === TradeActionType.OrderExecuted ? t`Price` : t`Acceptable Price`;
      const price =
        tradeAction.eventName === TradeActionType.OrderExecuted
          ? tradeAction.executionPrice
          : tradeAction.acceptablePrice;

      return t`${actionText} ${increaseText} ${positionText} ${sizeDeltaText}, ${pricePrefix}: ${formatAcceptablePrice(
        price,
        {
          displayDecimals: priceDecimals,
        }
      )}`;
    } else {
      const collateralText = formatTokenAmount(collateralDeltaAmount, collateralToken.decimals, collateralToken.symbol);

      if (isIncreaseOrderType(tradeAction.orderType!)) {
        return t`${actionText} Deposit ${collateralText} into ${positionText}`;
      } else {
        return t`${actionText} Withdraw ${collateralText} from ${positionText}`;
      }
    }
  }

  if (isLiquidationOrderType(tradeAction.orderType!) && tradeAction.eventName === TradeActionType.OrderExecuted) {
    const executionPrice = tradeAction.executionPrice;

    // FIXME LiquidationTooltip and some shitty character
    return t`${positionText} ${sizeDeltaText}, Price: ${formatUsd(executionPrice, {
      displayDecimals: priceDecimals,
    })}`;
  }

  return "Unknown action";
};
