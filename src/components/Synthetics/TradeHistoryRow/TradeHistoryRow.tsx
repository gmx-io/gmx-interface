import { t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getExplorerUrl } from "config/chains";
import {
  getTriggerPricePrefix,
  isIncreaseOrder,
  isLimitOrder,
  isLiquidationOrder,
  isMarketOrder,
  isSwapOrder,
  isTriggerDecreaseOrder,
} from "domain/synthetics/orders";
import { adaptToTokenInfo, getTokensRatioByAmounts } from "domain/synthetics/tokens";
import { TradeAction, TradeActionType } from "domain/synthetics/tradeHistory";
import { useChainId } from "lib/chains";
import { formatDateTime } from "lib/dates";
import { getExchangeRateDisplay } from "lib/legacy";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import "./TradeHistoryRow.scss";

type Props = {
  tradeAction: TradeAction;
};

const defaultMsg = "";

function getOrderActionText(tradeAction: TradeAction) {
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

function getSwapOrderMessage(tradeAction: TradeAction) {
  const tokenIn = tradeAction.initialCollateralToken;
  const tokenOut = tradeAction.targetCollateralToken;

  const amountIn = tradeAction.initialCollateralDeltaAmount;
  const amountOut = tradeAction.minOutputAmount;

  if (!tokenIn || !tokenOut || !amountIn || !amountOut) {
    return defaultMsg;
  }

  const fromText = formatTokenAmount(amountIn, tokenIn?.decimals, tokenIn?.symbol);
  const toText = formatTokenAmount(amountOut, tokenOut?.decimals, tokenOut?.symbol);

  if (isLimitOrder(tradeAction.orderType!)) {
    const actionText = getOrderActionText(tradeAction);

    const tokensRatio = getTokensRatioByAmounts({
      fromToken: tokenIn,
      toToken: tokenOut,
      fromTokenAmount: amountIn,
      toTokenAmount: amountOut,
    });

    const fromTokenInfo = tokenIn ? adaptToTokenInfo(tokenIn) : undefined;
    const toTokenInfo = tokenOut ? adaptToTokenInfo(tokenOut) : undefined;

    const [largest, smallest] =
      tokensRatio?.largestAddress === tokenIn?.address ? [fromTokenInfo, toTokenInfo] : [toTokenInfo, fromTokenInfo];

    const ratioText = getExchangeRateDisplay(tokensRatio?.ratio, largest, smallest);

    return t`${actionText} Order: Swap ${fromText} for ${toText}, Price: ${ratioText}`;
  }

  const actionText =
    tradeAction.eventName === TradeActionType.OrderCreated ? t`Request` : getOrderActionText(tradeAction);

  return t`${actionText} Swap ${fromText} for ${toText}`;
}

function getPositionOrderMessage(tradeAction: TradeAction) {
  const indexToken = tradeAction.indexToken;
  const collateralToken = tradeAction.initialCollateralToken;
  const sizeDeltaUsd = tradeAction.sizeDeltaUsd;
  const collateralDeltaAmount = tradeAction.initialCollateralDeltaAmount;

  if (!indexToken || !collateralToken) {
    return defaultMsg;
  }

  const increaseText = isIncreaseOrder(tradeAction.orderType!) ? t`Increase` : t`Decrease`;
  const longText = tradeAction.isLong ? t`Long` : t`Short`;
  const positionText = `${longText} ${indexToken.symbol}`;
  const sizeDeltaText = `${isIncreaseOrder(tradeAction.orderType!) ? "+" : "-"}${formatUsd(sizeDeltaUsd)}`;

  if (isLimitOrder(tradeAction.orderType!) || isTriggerDecreaseOrder(tradeAction.orderType!)) {
    const triggerPrice = tradeAction.triggerPrice;
    const pricePrefix = getTriggerPricePrefix(tradeAction.orderType!, tradeAction.isLong, true);
    const actionText = getOrderActionText(tradeAction);

    return t`${actionText} Order: ${increaseText} ${positionText} ${sizeDeltaText}, ${
      indexToken.symbol
    } Price: ${pricePrefix} ${formatUsd(triggerPrice)}`;
  }

  if (isMarketOrder(tradeAction.orderType!)) {
    const actionText =
      tradeAction.eventName === TradeActionType.OrderCreated ? t`Request` : getOrderActionText(tradeAction);

    if (sizeDeltaUsd?.gt(0)) {
      const acceptablePrice = tradeAction.acceptablePrice;

      return t`${actionText} ${increaseText} ${positionText} ${sizeDeltaText}, Acceptable Price: ${formatUsd(
        acceptablePrice
      )}`;
    } else {
      const collateralText = formatTokenAmount(collateralDeltaAmount, collateralToken.decimals, collateralToken.symbol);

      if (isIncreaseOrder(tradeAction.orderType!)) {
        return `${actionText} Deposit ${collateralText} into ${positionText}`;
      } else {
        return `${actionText} Withdraw ${collateralText} from ${positionText}`;
      }
    }
  }

  return defaultMsg;
}

function getPositionUpdateMessage(tradeAction: TradeAction) {
  const indexToken = tradeAction.indexToken;
  const collateralToken = tradeAction.initialCollateralToken;
  const sizeDeltaUsd = tradeAction.sizeDeltaUsd;
  const collateralDeltaAmount = tradeAction.initialCollateralDeltaAmount;

  if (!indexToken || !collateralToken) {
    return defaultMsg;
  }

  const increaseText = isIncreaseOrder(tradeAction.orderType!) ? t`Increase` : t`Decrease`;
  const longText = tradeAction.isLong ? t`Long` : t`Short`;
  const positionText = `${longText} ${indexToken.symbol}`;
  const sizeDeltaText = `${isIncreaseOrder(tradeAction.orderType!) ? "+" : "-"}${formatUsd(sizeDeltaUsd)}`;
  const executionPrice = tradeAction.executionPrice;

  if (isLiquidationOrder(tradeAction.orderType!)) {
    return t`Liquidated ${positionText} ${sizeDeltaText}, Price: ${formatUsd(executionPrice)}`;
  }

  if (sizeDeltaUsd?.gt(0)) {
    return `${increaseText} ${positionText} ${sizeDeltaText}, Price: ${formatUsd(executionPrice)}`;
  } else {
    const collateralText = formatTokenAmount(collateralDeltaAmount, collateralToken.decimals, collateralToken.symbol);
    if (isIncreaseOrder(tradeAction.orderType!)) {
      return t`Deposit ${collateralText} into ${positionText}`;
    } else {
      return t`Withdraw ${collateralText} from ${positionText}`;
    }
  }
}

function getTradeMessage(tradeAction: TradeAction) {
  if (
    [
      TradeActionType.OrderCreated,
      TradeActionType.OrderCancelled,
      TradeActionType.OrderExecuted,
      TradeActionType.OrderUpdated,
      TradeActionType.OrderFrozen,
    ].includes(tradeAction.eventName)
  ) {
    if (isSwapOrder(tradeAction.orderType!)) {
      return getSwapOrderMessage(tradeAction);
    }

    if (
      !isLiquidationOrder(tradeAction.orderType!) &&
      (isLimitOrder(tradeAction.orderType!) || tradeAction.eventName !== TradeActionType.OrderExecuted)
    ) {
      return getPositionOrderMessage(tradeAction);
    }
  }

  if ([TradeActionType.PositionDecrease, TradeActionType.PositionIncrease].includes(tradeAction.eventName)) {
    return getPositionUpdateMessage(tradeAction);
  }
}

export function TradeHistoryRow(p: Props) {
  const { chainId } = useChainId();
  const { tradeAction } = p;

  const msg = getTradeMessage(tradeAction);

  if (!msg) {
    return null;
  }

  return (
    <div className="TradeHistoryRow App-box App-box-border">
      <div className="muted TradeHistoryRow-time">{formatDateTime(tradeAction.transaction.timestamp)}</div>
      <ExternalLink className="plain" href={`${getExplorerUrl(chainId)}tx/${tradeAction.transaction.hash}`}>
        {msg}
      </ExternalLink>
    </div>
  );
}
