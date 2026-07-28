import { bigMath } from "utils/bigmath";
import { MarketsInfoData } from "utils/markets/types";
import { SwapPricingType } from "utils/orders/types";
import { SwapStrategyForSwapOrders } from "utils/swap/types";
import {
  convertToTokenAmount,
  convertToUsd,
  getIsEquivalentTokens,
  getIsUnwrap,
  getIsWrap,
  getMidPrice,
} from "utils/tokens";
import { TokenData } from "utils/tokens/types";
import { SwapOptimizationOrderArray } from "utils/trade/types";

import { createFindSwapPath } from "./swapPath";

/*
  Order/Priority of getting swap strategy:
  1. Check if it needs a swap and return noSwap if tokens are equivalent [noSwap]
  2. Check if there is a swap path stats for the internal swap quote and return internalSwap if there is [internalSwap]
  3. Return defaultSwapStrategy (noSwap) if there is no other swap strategy [noSwap]
*/

export function buildSwapStrategy({
  amountIn,
  tokenIn,
  tokenOut,
  marketsInfoData,
  chainId,
  swapOptimizationOrder,
  swapPricingType = SwapPricingType.Swap,
  allowSameTokenSwap,
  disabledMarkets,
  manualPath,
}: {
  chainId: number;
  amountIn: bigint;
  tokenIn: TokenData;
  tokenOut: TokenData;
  marketsInfoData: MarketsInfoData | undefined;
  swapOptimizationOrder: SwapOptimizationOrderArray | undefined;
  swapPricingType: SwapPricingType;
  allowSameTokenSwap: boolean;
  disabledMarkets?: string[];
  manualPath?: string[];
}): SwapStrategyForSwapOrders {
  const priceIn = tokenIn.prices.minPrice;
  const usdIn = convertToUsd(amountIn, tokenIn.decimals, priceIn)!;

  if (amountIn < 0n) {
    amountIn = 0n;
  }

  const defaultSwapStrategy: SwapStrategyForSwapOrders = {
    type: "noSwap",
    externalSwapQuote: undefined,
    swapPathStats: undefined,
    amountIn,
    amountOut: convertToTokenAmount(usdIn, tokenOut.decimals, tokenOut.prices.maxPrice)!,
    usdIn,
    usdOut: usdIn,
    priceIn,
    priceOut: tokenOut.prices.maxPrice,
    feesUsd: 0n,
  };

  if (
    (!allowSameTokenSwap && getIsEquivalentTokens(tokenIn, tokenOut)) ||
    getIsWrap(tokenIn, tokenOut) ||
    getIsUnwrap(tokenIn, tokenOut)
  ) {
    return defaultSwapStrategy;
  }

  const findSwapPath = createFindSwapPath({
    chainId,
    fromTokenAddress: tokenIn.address,
    toTokenAddress: tokenOut.address,
    marketsInfoData,
    swapPricingType,
    disabledMarkets,
    manualPath,
  });

  const swapPathStats = findSwapPath(usdIn, { order: swapOptimizationOrder });

  if (swapPathStats) {
    return {
      type: "internalSwap",
      swapPathStats,
      externalSwapQuote: undefined,
      amountIn,
      amountOut: swapPathStats.amountOut,
      usdIn: usdIn,
      usdOut: swapPathStats.usdOut,
      priceIn: priceIn,
      priceOut: tokenOut.prices.maxPrice,
      feesUsd: usdIn - swapPathStats.usdOut,
    };
  }

  return defaultSwapStrategy;
}

// Used for getting swap amounts by to value
export function buildReverseSwapStrategy({
  amountOut,
  tokenIn,
  tokenOut,
  marketsInfoData,
  chainId,
  swapOptimizationOrder,
  swapPricingType,
  allowSameTokenSwap,
  disabledMarkets,
  manualPath,
}: {
  chainId: number;
  amountOut: bigint;
  tokenIn: TokenData;
  tokenOut: TokenData;
  marketsInfoData: MarketsInfoData | undefined;
  swapOptimizationOrder: SwapOptimizationOrderArray | undefined;
  swapPricingType: SwapPricingType;
  allowSameTokenSwap: boolean;
  disabledMarkets?: string[];
  manualPath?: string[];
}): SwapStrategyForSwapOrders {
  const priceIn = getMidPrice(tokenIn.prices);
  const priceOut = getMidPrice(tokenOut.prices);

  const preferredUsdOut = convertToUsd(amountOut, tokenOut.decimals, getMidPrice(tokenOut.prices))!;
  const approximateAmountIn = convertToTokenAmount(preferredUsdOut, tokenIn.decimals, getMidPrice(tokenIn.prices))!;
  const approximateUsdIn = preferredUsdOut;

  const defaultSwapStrategy: SwapStrategyForSwapOrders = {
    type: "noSwap",
    externalSwapQuote: undefined,
    swapPathStats: undefined,
    amountIn: approximateAmountIn,
    amountOut: amountOut,
    usdIn: approximateUsdIn,
    usdOut: preferredUsdOut,
    priceIn,
    priceOut,
    feesUsd: 0n,
  };

  if (
    (!allowSameTokenSwap && getIsEquivalentTokens(tokenIn, tokenOut)) ||
    getIsWrap(tokenIn, tokenOut) ||
    getIsUnwrap(tokenIn, tokenOut)
  ) {
    return defaultSwapStrategy;
  }

  const findSwapPath = createFindSwapPath({
    chainId,
    fromTokenAddress: tokenIn.address,
    toTokenAddress: tokenOut.address,
    marketsInfoData,
    swapPricingType,
    disabledMarkets,
    manualPath,
  });

  const approximateSwapPathStats = findSwapPath(approximateUsdIn, { order: swapOptimizationOrder });

  if (approximateSwapPathStats) {
    // Increase or decrease usdIn the same way preferred usdOut is different from swapStrategy.usdOut
    // preferred_in / approximate_in = preferred_out / approximate_out
    // preferred_in = approximate_in * preferred_out / approximate_out
    const adjustedUsdIn =
      approximateSwapPathStats.usdOut > 0
        ? bigMath.mulDiv(approximateUsdIn, preferredUsdOut, approximateSwapPathStats.usdOut)
        : 0n;
    const adjustedAmountIn = convertToTokenAmount(adjustedUsdIn, tokenIn.decimals, getMidPrice(tokenIn.prices))!;

    const adjustedSwapPathStats = findSwapPath(adjustedUsdIn, { order: swapOptimizationOrder });

    if (adjustedSwapPathStats) {
      return {
        type: "internalSwap",
        swapPathStats: adjustedSwapPathStats,
        externalSwapQuote: undefined,
        amountIn: adjustedAmountIn,
        amountOut: adjustedSwapPathStats.amountOut,
        usdIn: adjustedUsdIn,
        usdOut: adjustedSwapPathStats.usdOut,
        priceIn: priceIn,
        priceOut: priceOut,
        feesUsd: adjustedUsdIn - adjustedSwapPathStats.usdOut,
      };
    }
  }

  return defaultSwapStrategy;
}
