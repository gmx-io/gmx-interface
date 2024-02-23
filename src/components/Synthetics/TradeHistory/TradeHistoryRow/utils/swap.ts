import { t } from "@lingui/macro";

import type { MarketInfo, MarketsInfoData } from "domain/synthetics/markets/types";
import { OrderType } from "domain/synthetics/orders";
import { TokenData, adaptToV1TokenInfo, getTokensRatioByAmounts } from "domain/synthetics/tokens";
import { SwapTradeAction, TradeActionType } from "domain/synthetics/tradeHistory";
import { getExchangeRateDisplay } from "lib/legacy";
import { formatTokenAmount } from "lib/numbers";

import { getActionTitle } from "../../keys";
import { RowDetails, TooltipContent, formatTradeActionTimestamp, lines } from "./shared";

export const formatSwapMessage = (
  tradeAction: SwapTradeAction,
  marketsInfoData?: MarketsInfoData,
  relativeTimestamp = true
): RowDetails => {
  const tokenIn = tradeAction.initialCollateralToken!;
  const tokenOut = tradeAction.targetCollateralToken!;
  const amountIn = tradeAction.initialCollateralDeltaAmount!;
  const amountOut =
    tradeAction.eventName === TradeActionType.OrderExecuted
      ? tradeAction.executionAmountOut!
      : tradeAction.minOutputAmount!;

  const fromText = formatTokenAmount(amountIn, tokenIn?.decimals, tokenIn?.symbol, {
    useCommas: true,
  });
  const toText = formatTokenAmount(amountOut, tokenOut?.decimals, tokenOut?.symbol, {
    useCommas: true,
  });

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

  let greaterSign = largest?.address === tokenOut?.address ? "< " : "> ";
  let triggerPrice = getExchangeRateDisplay(tokensRatio?.ratio, smallest, largest);

  let ratioText = "";

  if (tokensRatio.ratio.lte(0)) {
    ratioText = "0";
  } else if (tradeAction.eventName === TradeActionType.OrderCreated) {
    ratioText = greaterSign + triggerPrice;
  } else {
    ratioText = getExchangeRateDisplay(tokensRatio?.ratio, smallest, largest);
  }

  const market = !marketsInfoData
    ? "..."
    : tradeAction.swapPath
        ?.map((marketAddress) => marketsInfoData?.[marketAddress])
        .reduce(
          (acc: TokenData[], marketInfo: MarketInfo) => {
            const last = acc[acc.length - 1];

            if (last.address === marketInfo?.longToken.address) {
              acc.push(marketInfo.shortToken);
            } else if (last.address === marketInfo?.shortToken.address) {
              acc.push(marketInfo.longToken);
            }

            return acc;
          },
          [tradeAction.initialCollateralToken] as TokenData[]
        )
        .map((token: TokenData) => token?.symbol)
        .join(" → ");

  const size = `${fromText} to ${toText}`;

  let actionText = getActionTitle(tradeAction.orderType, tradeAction.eventName);

  let priceComment: TooltipContent = lines();
  if (tradeAction.orderType === OrderType.LimitSwap) {
    if (
      tradeAction.eventName === TradeActionType.OrderCreated ||
      tradeAction.eventName === TradeActionType.OrderUpdated
    ) {
      const formattedMinReceive = formatTokenAmount(
        tradeAction.minOutputAmount!,
        tokenOut?.decimals,
        tokenOut?.symbol,
        {
          useCommas: true,
        }
      );

      priceComment = lines(
        t`Ratio price for the order at the time of creation.`,
        "",
        t`It may differ at the time of execution based on swap fees and price impact to guarantee that you will receive at least ${formattedMinReceive} if this order is executed.`
      );
    } else if (
      tradeAction.eventName === TradeActionType.OrderFrozen ||
      tradeAction.eventName === TradeActionType.OrderExecuted
    ) {
      priceComment = lines(
        t`Execution price for the order.`,
        "",
        t`Order Trigger Price: ${greaterSign}${triggerPrice}`
      );
    }
  } else {
    if (
      tradeAction.eventName === TradeActionType.OrderCreated ||
      tradeAction.eventName === TradeActionType.OrderUpdated
    ) {
      priceComment = lines(t`Acceptable price for the order.`);
    } else if (
      tradeAction.eventName === TradeActionType.OrderFrozen ||
      tradeAction.eventName === TradeActionType.OrderExecuted
    ) {
      priceComment = lines(
        t`Execution price for the order.`,
        "",
        t`Order Acceptable Price: ${greaterSign}${triggerPrice}`
      );
    }
  }

  return {
    action: actionText,
    market: market,
    size: size,
    price: ratioText,
    priceComment: priceComment,
    timestamp: formatTradeActionTimestamp(tradeAction.transaction.timestamp, relativeTimestamp),
  };
};
