import { t } from "@lingui/macro";
import { BigNumber } from "ethers";

import type { MarketInfo, MarketsInfoData } from "domain/synthetics/markets/types";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets/utils";
import { OrderType } from "domain/synthetics/orders";
import { TokenData, adaptToV1TokenInfo, getTokensRatioByAmounts } from "domain/synthetics/tokens";
import { SwapTradeAction, TradeActionType } from "domain/synthetics/tradeHistory";
import { getExchangeRateDisplay } from "lib/legacy";
import { formatTokenAmount } from "lib/numbers";

import { getActionTitle } from "../../keys";
import {
  MakeOptional,
  RowDetails,
  formatTradeActionTimestamp,
  formatTradeActionTimestampISO,
  infoRow,
  lines,
  tryGetError,
} from "./shared";

export const formatSwapMessage = (
  tradeAction: SwapTradeAction,
  marketsInfoData?: MarketsInfoData,
  relativeTimestamp = true
): RowDetails => {
  const tokenIn = tradeAction.initialCollateralToken!;
  const tokenOut = tradeAction.targetCollateralToken!;
  const amountIn = tradeAction.initialCollateralDeltaAmount!;

  const fromText = formatTokenAmount(amountIn, tokenIn?.decimals, tokenIn?.symbol, {
    useCommas: true,
  });

  const toExecutionText = formatTokenAmount(tradeAction.executionAmountOut, tokenOut?.decimals, tokenOut?.symbol, {
    useCommas: true,
  });
  const toMinText = formatTokenAmount(tradeAction.minOutputAmount, tokenOut?.decimals, tokenOut?.symbol, {
    useCommas: true,
  });

  const tokensExecutionRatio =
    tradeAction.executionAmountOut &&
    getTokensRatioByAmounts({
      fromToken: tokenIn,
      toToken: tokenOut,
      fromTokenAmount: amountIn,
      toTokenAmount: tradeAction.executionAmountOut,
    });

  const tokensMinRatio =
    tradeAction.minOutputAmount &&
    getTokensRatioByAmounts({
      fromToken: tokenIn,
      toToken: tokenOut,
      fromTokenAmount: amountIn,
      toTokenAmount: tradeAction.minOutputAmount,
    });

  const fromTokenInfo = tokenIn ? adaptToV1TokenInfo(tokenIn) : undefined;
  const toTokenInfo = tokenOut ? adaptToV1TokenInfo(tokenOut) : undefined;

  const [largest, smallest] =
    tokensExecutionRatio?.largestToken.address === tokenIn?.address
      ? [fromTokenInfo, toTokenInfo]
      : [toTokenInfo, fromTokenInfo];

  const greaterSign = largest?.address === tokenOut?.address ? "<  " : ">  ";
  const executionRate = getExchangeRateDisplay(tokensExecutionRatio?.ratio, smallest, largest);
  const acceptableRate = getExchangeRateDisplay(tokensMinRatio?.ratio, smallest, largest);

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

  const fullMarket = !marketsInfoData
    ? "..."
    : tradeAction.swapPath?.map((marketAddress) => marketsInfoData?.[marketAddress].name).join(" → ");

  const fullMarketNames: RowDetails["fullMarketNames"] = !marketsInfoData
    ? undefined
    : tradeAction.swapPath?.map((marketAddress) => {
        const marketInfo = marketsInfoData?.[marketAddress];
        const indexName = getMarketIndexName({
          indexToken: marketInfo.indexToken,
          isSpotOnly: marketInfo.isSpotOnly,
        });
        const poolName = getMarketPoolName({
          longToken: marketInfo.longToken,
          shortToken: marketInfo.shortToken,
        });

        return {
          indexName: indexName,
          poolName: poolName,
        };
      });

  let actionText = getActionTitle(tradeAction.orderType, tradeAction.eventName);

  let result: MakeOptional<RowDetails, "action" | "market" | "timestamp" | "timestampISO">;

  const ot = tradeAction.orderType;
  const ev = tradeAction.eventName;

  if (
    (ot === OrderType.LimitSwap && ev === TradeActionType.OrderCreated) ||
    (ot === OrderType.LimitSwap && ev === TradeActionType.OrderUpdated) ||
    (ot === OrderType.LimitSwap && ev === TradeActionType.OrderCancelled)
  ) {
    const formattedMinReceive = formatTokenAmount(tradeAction.minOutputAmount!, tokenOut?.decimals, tokenOut?.symbol, {
      useCommas: true,
    });

    result = {
      price: `${greaterSign}${acceptableRate}`,
      priceComment: lines(
        t`Acceptable price for the order.`,
        "",
        t`The trigger price for this order is based on the swap fees and price impact to guarantee that you will receive at least ${formattedMinReceive} on order execution.`
      ),
      size: t`${fromText} to ${toMinText}`,
    };
  } else if (ot === OrderType.LimitSwap && ev === TradeActionType.OrderExecuted) {
    result = {
      price: executionRate,
      priceComment: lines(
        t`Execution price for the order.`,
        "",
        infoRow(t`Order Acceptable Price`, `${greaterSign}${acceptableRate}`)
      ),
      size: t`${fromText} to ${toExecutionText}`,
    };
  } else if (ot === OrderType.LimitSwap && ev === TradeActionType.OrderFrozen) {
    const error = tradeAction.reasonBytes && tryGetError(tradeAction.reasonBytes);
    const outputAmount = error?.args?.outputAmount as BigNumber | undefined;
    const ratio =
      outputAmount &&
      getTokensRatioByAmounts({
        fromToken: tokenIn,
        toToken: tokenOut,
        fromTokenAmount: amountIn,
        toTokenAmount: outputAmount,
      });
    const rate = getExchangeRateDisplay(ratio?.ratio, tokenIn, tokenOut);
    const toExecutionText = formatTokenAmount(outputAmount, tokenOut?.decimals, tokenOut?.symbol, {
      useCommas: true,
    });

    result = {
      price: rate,
      priceComment: lines(
        t`Execution price for the order.`,
        "",
        infoRow(t`Order Acceptable Price`, `${greaterSign}${acceptableRate}`)
      ),
      size: t`${fromText} to ${toExecutionText}`,
    };
  } else if (
    (ot === OrderType.MarketSwap && ev === TradeActionType.OrderCreated) ||
    (ot === OrderType.MarketSwap && ev === TradeActionType.OrderUpdated)
  ) {
    result = {
      price: `${greaterSign}${acceptableRate}`,
      priceComment: lines(t`Acceptable price for the order.`),
      size: t`${fromText} to ${toMinText}`,
    };
  } else if (ot === OrderType.MarketSwap && ev === TradeActionType.OrderExecuted) {
    result = {
      price: executionRate,
      priceComment: lines(
        t`Execution price for the order.`,
        "",
        infoRow(t`Order Acceptable Price`, `${greaterSign}${acceptableRate}`)
      ),
      size: t`${fromText} to ${toExecutionText}`,
    };
  } else if (ot === OrderType.MarketSwap && ev === TradeActionType.OrderCancelled) {
    const error = tradeAction.reasonBytes && tryGetError(tradeAction.reasonBytes);
    const outputAmount = error?.args?.outputAmount as BigNumber | undefined;
    const ratio =
      outputAmount &&
      getTokensRatioByAmounts({
        fromToken: tokenIn,
        toToken: tokenOut,
        fromTokenAmount: amountIn,
        toTokenAmount: outputAmount,
      });
    const rate = getExchangeRateDisplay(ratio?.ratio, tokenIn, tokenOut);
    const toExecutionText = formatTokenAmount(outputAmount, tokenOut?.decimals, tokenOut?.symbol, {
      useCommas: true,
    });

    result = {
      price: rate,
      priceComment: lines(
        t`Execution price for the order.`,
        "",
        infoRow(t`Order Acceptable Price`, `${greaterSign}${acceptableRate}`)
      ),
      size: t`${fromText} to ${toExecutionText}`,
    };
  }

  return {
    action: actionText,
    market: market,
    fullMarket: fullMarket,
    timestamp: formatTradeActionTimestamp(tradeAction.transaction.timestamp, relativeTimestamp),
    timestampISO: formatTradeActionTimestampISO(tradeAction.transaction.timestamp),
    acceptablePrice: `${greaterSign}${acceptableRate}`,
    executionPrice: executionRate,
    fullMarketNames,
    ...result!,
  };
};
