import { useMemo } from "react";
import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getExplorerUrl } from "config/chains";
import {
  isIncreaseOrderType,
  isLimitOrderType,
  isLiquidationOrderType,
  isMarketOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import { adaptToV1TokenInfo, getTokensRatioByAmounts } from "domain/synthetics/tokens";
import { PositionTradeAction, SwapTradeAction, TradeAction, TradeActionType } from "domain/synthetics/tradeHistory";
import { useChainId } from "lib/chains";
import { formatDateTime } from "lib/dates";
import { getExchangeRateDisplay } from "lib/legacy";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { BigNumber } from "ethers";
import { LiquidationTooltip } from "./LiquidationTooltip";
import "./TradeHistoryRow.scss";
import { getTriggerThresholdType } from "domain/synthetics/trade";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { Link } from "react-router-dom";
import { formatAcceptablePrice } from "domain/synthetics/positions";
import { MarketInfo, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";

type Props = {
  tradeAction: TradeAction;
  minCollateralUsd: BigNumber;
  shouldDisplayAccount?: boolean;
};

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

function renderMarketName(market: MarketInfo) {
  const indexName = getMarketIndexName(market);
  const poolName = getMarketPoolName(market);
  return (
    <div className="items-top">
      <span>{indexName}</span>
      <span className="subtext">[{poolName}]</span>
    </div>
  );
}

function getSwapOrderMessage(tradeAction: SwapTradeAction) {
  const tokenIn = tradeAction.initialCollateralToken!;
  const tokenOut = tradeAction.targetCollateralToken!;
  const amountIn = tradeAction.initialCollateralDeltaAmount!;

  const amountOut =
    tradeAction.eventName === TradeActionType.OrderExecuted
      ? tradeAction.executionAmountOut!
      : tradeAction.minOutputAmount!;

  const fromText = formatTokenAmount(amountIn, tokenIn?.decimals, tokenIn?.symbol);
  const toText = formatTokenAmount(amountOut, tokenOut?.decimals, tokenOut?.symbol);

  if (isLimitOrderType(tradeAction.orderType!)) {
    const actionText = getOrderActionText(tradeAction);

    const tokensRatio = getTokensRatioByAmounts({
      fromToken: tokenIn,
      toToken: tokenOut,
      fromTokenAmount: amountIn,
      toTokenAmount: amountOut,
    });

    const fromTokenInfo = tokenIn ? adaptToV1TokenInfo(tokenIn) : undefined;
    const toTokenInfo = tokenOut ? adaptToV1TokenInfo(tokenOut) : undefined;

    const [largest, smallest] =
      tokensRatio?.largestToken.address === tokenIn?.address
        ? [fromTokenInfo, toTokenInfo]
        : [toTokenInfo, fromTokenInfo];

    const ratioText = tokensRatio.ratio.gt(0) ? getExchangeRateDisplay(tokensRatio?.ratio, largest, smallest) : "0";

    return t`${actionText} Order: Swap ${fromText} for ${toText}, Price: ${ratioText}`;
  }

  const actionText =
    tradeAction.eventName === TradeActionType.OrderCreated ? t`Request` : getOrderActionText(tradeAction);

  return t`${actionText} Swap ${fromText} for ${toText}`;
}

function getPositionOrderMessage(tradeAction: PositionTradeAction, minCollateralUsd: BigNumber) {
  const indexToken = tradeAction.indexToken;
  const priceDecimals = tradeAction.indexToken.priceDecimals;
  const collateralToken = tradeAction.initialCollateralToken;
  const sizeDeltaUsd = tradeAction.sizeDeltaUsd;
  const collateralDeltaAmount = tradeAction.initialCollateralDeltaAmount;

  const increaseText = isIncreaseOrderType(tradeAction.orderType!) ? t`Increase` : t`Decrease`;
  const longText = tradeAction.isLong ? t`Long` : t`Short`;
  const positionText = `${longText} ${indexToken.symbol}`;
  const sizeDeltaText = `${isIncreaseOrderType(tradeAction.orderType!) ? "+" : "-"}${formatUsd(sizeDeltaUsd)}`;

  if (isLimitOrderType(tradeAction.orderType!) || isTriggerDecreaseOrderType(tradeAction.orderType!)) {
    const triggerPrice = tradeAction.triggerPrice;
    const executionPrice = tradeAction.executionPrice;
    const pricePrefix = getTriggerThresholdType(tradeAction.orderType!, tradeAction.isLong!);
    const actionText = getOrderActionText(tradeAction);

    if (tradeAction.eventName === TradeActionType.OrderExecuted) {
      return (
        <Trans>
          Execute Order: {increaseText} {positionText} {sizeDeltaText}, {indexToken.symbol} Price:
          {formatUsd(executionPrice, { displayDecimals: priceDecimals })}, Market:{" "}
          {renderMarketName(tradeAction.marketInfo)}
        </Trans>
      );
    }

    return (
      <Trans>
        {actionText} Order: {increaseText} {positionText} {sizeDeltaText}, {indexToken.symbol} Price: {pricePrefix}{" "}
        {formatUsd(triggerPrice, { displayDecimals: priceDecimals })}, Market:{" "}
        {renderMarketName(tradeAction.marketInfo)}
      </Trans>
    );
  }

  if (isMarketOrderType(tradeAction.orderType!)) {
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

      return (
        <Trans>
          {actionText} {increaseText} {positionText} {sizeDeltaText}, {pricePrefix}:{" "}
          {formatAcceptablePrice(price, {
            displayDecimals: priceDecimals,
          })}
          , Market: {renderMarketName(tradeAction.marketInfo)}
        </Trans>
      );
    } else {
      const collateralText = formatTokenAmount(collateralDeltaAmount, collateralToken.decimals, collateralToken.symbol);

      if (isIncreaseOrderType(tradeAction.orderType!)) {
        return (
          <Trans>
            {actionText} Deposit {collateralText} into {positionText}, Market:{" "}
            {renderMarketName(tradeAction.marketInfo)}
          </Trans>
        );
      } else {
        return (
          <Trans>
            {actionText} Withdraw {collateralText} from {positionText}, Market:{" "}
            {renderMarketName(tradeAction.marketInfo)}
          </Trans>
        );
      }
    }
  }

  if (isLiquidationOrderType(tradeAction.orderType!) && tradeAction.eventName === TradeActionType.OrderExecuted) {
    const executionPrice = tradeAction.executionPrice;

    return (
      <>
        <LiquidationTooltip tradeAction={tradeAction} minCollateralUsd={minCollateralUsd} />
        {" "}
        <Trans>
          {positionText} {sizeDeltaText}, Price: {formatUsd(executionPrice, { displayDecimals: priceDecimals })},
          Market: {renderMarketName(tradeAction.marketInfo)}
        </Trans>
      </>
    );
  }

  return undefined;
}

export function TradeHistoryRow(p: Props) {
  const { chainId } = useChainId();
  const { showDebugValues } = useSettings();
  const { tradeAction, minCollateralUsd, shouldDisplayAccount } = p;

  const msg = useMemo(() => {
    if (isSwapOrderType(tradeAction.orderType!)) {
      return getSwapOrderMessage(tradeAction as SwapTradeAction);
    } else {
      return getPositionOrderMessage(tradeAction as PositionTradeAction, minCollateralUsd);
    }
  }, [minCollateralUsd, tradeAction]);

  if (!msg) return null;

  return (
    <div className="TradeHistoryRow App-box App-box-border">
      <div className="muted TradeHistoryRow-time">
        {formatDateTime(tradeAction.transaction.timestamp)}{" "}
        {shouldDisplayAccount && (
          <span>
            {" "}
            (<Link to={`/actions/v2/${tradeAction.account}`}>{tradeAction.account}</Link>)
          </span>
        )}
      </div>
      <ExternalLink className="plain" href={`${getExplorerUrl(chainId)}tx/${tradeAction.transaction.hash}`}>
        {msg}
      </ExternalLink>
      {showDebugValues && (
        <>
          <br />
          <br />
          <div className="muted">Order Key: {tradeAction.orderKey}</div>
        </>
      )}
    </div>
  );
}
