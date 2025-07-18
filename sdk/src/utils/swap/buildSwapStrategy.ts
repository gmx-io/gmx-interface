import { MarketsInfoData } from "types/markets";
import { SwapStrategyForSwapOrders } from "types/swapStrategy";
import { TokenData } from "types/tokens";
import { ExternalSwapQuoteParams, SwapOptimizationOrderArray } from "types/trade";
import { convertToUsd, getIsEquivalentTokens, getIsStake, getIsUnstake } from "utils/tokens";

import { getAvailableExternalSwapPaths } from "./externalSwapPath";
import { getExternalSwapQuoteByPath } from "./externalSwapQuoteByPath";
import { createFindSwapPath } from "./swapPath";

/*
  Order/Priority of getting swap strategy:
  1. Check if it needs a swap and return noSwap if tokens are equivalent, stake or unstake [noSwap]
  2. Check if there is a swap path stats for the internal swap quote and return internalSwap if there is [internalSwap]
  3. Check if there is a combined swap strategy and return combinedSwap if there is [combinedSwap]
  4. Return defaultSwapStrategy (noSwap) if there is no other swap strategy [noSwap]
*/

export function buildSwapStrategy({
  amountIn,
  tokenIn,
  tokenOut,
  marketsInfoData,
  chainId,
  swapOptimizationOrder,
  externalSwapQuoteParams,
}: {
  chainId: number;
  amountIn: bigint;
  tokenIn: TokenData;
  tokenOut: TokenData;
  marketsInfoData: MarketsInfoData | undefined;
  swapOptimizationOrder: SwapOptimizationOrderArray | undefined;
  externalSwapQuoteParams: ExternalSwapQuoteParams;
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
    amountOut: amountIn,
    usdIn,
    usdOut: usdIn,
    priceIn,
    priceOut: tokenOut.prices.maxPrice,
    feesUsd: 0n,
  };

  if (getIsEquivalentTokens(tokenIn, tokenOut) || getIsStake(tokenIn, tokenOut) || getIsUnstake(tokenIn, tokenOut)) {
    return defaultSwapStrategy;
  }

  const findSwapPath = createFindSwapPath({
    chainId,
    fromTokenAddress: tokenIn.address,
    toTokenAddress: tokenOut.address,
    marketsInfoData,
    isExpressFeeSwap: false,
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

  const availableExternalSwapPaths = getAvailableExternalSwapPaths({ chainId, fromTokenAddress: tokenIn.address });

  const suitableSwapPath = availableExternalSwapPaths.find((path) => {
    const findSwapPath = createFindSwapPath({
      chainId,
      fromTokenAddress: path.outTokenAddress,
      toTokenAddress: tokenOut.address,
      marketsInfoData,
      isExpressFeeSwap: false,
    });

    const swapPathStats = findSwapPath(1n);

    return Boolean(swapPathStats);
  });

  if (suitableSwapPath && suitableSwapPath.outTokenAddress !== tokenOut.address) {
    const externalSwapQuoteForCombinedSwap = getExternalSwapQuoteByPath({
      amountIn,
      externalSwapPath: suitableSwapPath,
      externalSwapQuoteParams,
    });
    const findSwapPathForSuitableSwapPath = createFindSwapPath({
      chainId,
      fromTokenAddress: suitableSwapPath.outTokenAddress,
      toTokenAddress: tokenOut.address,
      marketsInfoData,
      isExpressFeeSwap: false,
    });

    const swapPathStatsForCombinedSwap = externalSwapQuoteForCombinedSwap
      ? findSwapPathForSuitableSwapPath(externalSwapQuoteForCombinedSwap.usdOut)
      : undefined;

    return externalSwapQuoteForCombinedSwap && swapPathStatsForCombinedSwap
      ? {
          type: "combinedSwap",
          externalSwapQuote: externalSwapQuoteForCombinedSwap,
          swapPathStats: swapPathStatsForCombinedSwap,
          amountIn,
          amountOut: swapPathStatsForCombinedSwap.amountOut,
          usdIn: externalSwapQuoteForCombinedSwap.usdIn,
          usdOut: swapPathStatsForCombinedSwap.usdOut,
          priceIn: externalSwapQuoteForCombinedSwap.priceIn,
          priceOut: tokenOut.prices.maxPrice,
          feesUsd: externalSwapQuoteForCombinedSwap.usdIn - swapPathStatsForCombinedSwap.usdOut,
        }
      : defaultSwapStrategy;
  }

  return defaultSwapStrategy;
}

// Used for getting swap amounts by to value
export function buildReverseSwapStrategy({
  amountIn,
  tokenIn,
  tokenOut,
  marketsInfoData,
  chainId,
  externalSwapQuoteParams,
  swapOptimizationOrder,
}: {
  chainId: number;
  amountIn: bigint;
  tokenIn: TokenData;
  tokenOut: TokenData;
  marketsInfoData: MarketsInfoData | undefined;
  externalSwapQuoteParams: ExternalSwapQuoteParams;
  swapOptimizationOrder: SwapOptimizationOrderArray | undefined;
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
    amountOut: amountIn,
    usdIn,
    usdOut: usdIn,
    priceIn,
    priceOut: tokenOut.prices.maxPrice,
    feesUsd: 0n,
  };

  if (getIsEquivalentTokens(tokenIn, tokenOut) || getIsStake(tokenIn, tokenOut) || getIsUnstake(tokenIn, tokenOut)) {
    return defaultSwapStrategy;
  }

  const findSwapPath = createFindSwapPath({
    chainId,
    fromTokenAddress: tokenIn.address,
    toTokenAddress: tokenOut.address,
    marketsInfoData,
    isExpressFeeSwap: false,
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

  const availableExternalSwapPaths = getAvailableExternalSwapPaths({ chainId, fromTokenAddress: tokenIn.address });

  const suitableSwapPath = availableExternalSwapPaths.find((path) => {
    if (path.outTokenAddress !== tokenOut.address) return false;

    const findSwapPath = createFindSwapPath({
      chainId,
      fromTokenAddress: tokenIn.address,
      toTokenAddress: path.inTokenAddress,
      marketsInfoData,
      isExpressFeeSwap: false,
    });

    const swapPathStats = findSwapPath(1n);

    return Boolean(swapPathStats);
  });

  if (suitableSwapPath) {
    const externalSwapQuoteForCombinedSwap = getExternalSwapQuoteByPath({
      amountIn,
      externalSwapPath: suitableSwapPath,
      externalSwapQuoteParams,
    });
    const findSwapPathForSuitableSwapPath = createFindSwapPath({
      chainId,
      fromTokenAddress: tokenIn.address,
      toTokenAddress: suitableSwapPath.inTokenAddress,
      marketsInfoData,
      isExpressFeeSwap: false,
    });

    const swapPathStatsForCombinedSwap = externalSwapQuoteForCombinedSwap
      ? findSwapPathForSuitableSwapPath(externalSwapQuoteForCombinedSwap.usdOut)
      : undefined;

    return externalSwapQuoteForCombinedSwap && swapPathStatsForCombinedSwap
      ? {
          type: "combinedSwap",
          externalSwapQuote: externalSwapQuoteForCombinedSwap,
          swapPathStats: swapPathStatsForCombinedSwap,
          amountIn,
          amountOut: swapPathStatsForCombinedSwap.amountOut,
          usdIn: externalSwapQuoteForCombinedSwap.usdIn,
          usdOut: swapPathStatsForCombinedSwap.usdOut,
          priceIn: externalSwapQuoteForCombinedSwap.priceIn,
          priceOut: tokenOut.prices.maxPrice,
          feesUsd: externalSwapQuoteForCombinedSwap.usdIn - swapPathStatsForCombinedSwap.usdOut,
        }
      : defaultSwapStrategy;
  }

  return defaultSwapStrategy;
}
