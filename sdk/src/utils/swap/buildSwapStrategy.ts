import { bigMath } from "utils/bigmath";
import {
  convertToTokenAmount,
  convertToUsd,
  getIsEquivalentTokens,
  getIsStake,
  getIsUnstake,
  getIsUnwrap,
  getIsWrap,
  getMidPrice,
} from "utils/tokens";

import { getAvailableExternalSwapPaths } from "./externalSwapPath";
import { getExternalSwapQuoteByPath } from "./externalSwapQuoteByPath";
import { createFindSwapPath } from "./swapPath";
import { MarketsInfoData } from "../markets/types";
import { SwapPricingType } from "../orders/types";
import { SwapStrategyForSwapOrders } from "../swap/types";
import { TokenData } from "../tokens/types";
import { ExternalSwapQuoteParams, SwapOptimizationOrderArray } from "../trade/types";

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
  swapPricingType = SwapPricingType.Swap,
  allowSameTokenSwap,
}: {
  chainId: number;
  amountIn: bigint;
  tokenIn: TokenData;
  tokenOut: TokenData;
  marketsInfoData: MarketsInfoData | undefined;
  swapOptimizationOrder: SwapOptimizationOrderArray | undefined;
  externalSwapQuoteParams: ExternalSwapQuoteParams;
  swapPricingType: SwapPricingType;
  allowSameTokenSwap: boolean;
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
    getIsUnwrap(tokenIn, tokenOut) ||
    getIsStake(tokenIn, tokenOut) ||
    getIsUnstake(tokenIn, tokenOut)
  ) {
    return defaultSwapStrategy;
  }

  const findSwapPath = createFindSwapPath({
    chainId,
    fromTokenAddress: tokenIn.address,
    toTokenAddress: tokenOut.address,
    marketsInfoData,
    swapPricingType,
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
      swapPricingType,
    });

    const swapPathStats = findSwapPath(usdIn);

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
      swapPricingType,
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
  amountOut,
  tokenIn,
  tokenOut,
  marketsInfoData,
  chainId,
  externalSwapQuoteParams,
  swapOptimizationOrder,
  swapPricingType,
  allowSameTokenSwap,
}: {
  chainId: number;
  amountOut: bigint;
  tokenIn: TokenData;
  tokenOut: TokenData;
  marketsInfoData: MarketsInfoData | undefined;
  externalSwapQuoteParams: ExternalSwapQuoteParams | undefined;
  swapOptimizationOrder: SwapOptimizationOrderArray | undefined;
  swapPricingType: SwapPricingType;
  allowSameTokenSwap: boolean;
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
    getIsUnwrap(tokenIn, tokenOut) ||
    getIsStake(tokenIn, tokenOut) ||
    getIsUnstake(tokenIn, tokenOut)
  ) {
    return defaultSwapStrategy;
  }

  const findSwapPath = createFindSwapPath({
    chainId,
    fromTokenAddress: tokenIn.address,
    toTokenAddress: tokenOut.address,
    marketsInfoData,
    swapPricingType,
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

  const availableExternalSwapPaths = getAvailableExternalSwapPaths({ chainId, fromTokenAddress: tokenIn.address });

  const suitableSwapPath = availableExternalSwapPaths.find((path) => {
    if (path.outTokenAddress !== tokenOut.address) return false;

    const findSwapPath = createFindSwapPath({
      chainId,
      fromTokenAddress: tokenIn.address,
      toTokenAddress: path.inTokenAddress,
      marketsInfoData,
      swapPricingType,
    });

    const swapPathStats = findSwapPath(approximateUsdIn);

    return Boolean(swapPathStats);
  });

  if (suitableSwapPath && externalSwapQuoteParams) {
    const approximateExternalSwapQuoteForCombinedSwap = getExternalSwapQuoteByPath({
      amountIn: approximateAmountIn,
      externalSwapPath: suitableSwapPath,
      externalSwapQuoteParams,
    });

    if (!approximateExternalSwapQuoteForCombinedSwap) {
      return defaultSwapStrategy;
    }

    const findSwapPathForSuitableSwapPath = createFindSwapPath({
      chainId,
      fromTokenAddress: tokenIn.address,
      toTokenAddress: suitableSwapPath.inTokenAddress,
      marketsInfoData,
      swapPricingType,
    });

    const approximateSwapPathStatsForCombinedSwap = findSwapPathForSuitableSwapPath(
      approximateExternalSwapQuoteForCombinedSwap.usdOut
    );

    if (!approximateSwapPathStatsForCombinedSwap) {
      return defaultSwapStrategy;
    }

    const adjustedUsdIn =
      approximateSwapPathStatsForCombinedSwap.usdOut > 0
        ? bigMath.mulDiv(approximateUsdIn, preferredUsdOut, approximateSwapPathStatsForCombinedSwap.usdOut)
        : 0n;

    const adjustedAmountIn = convertToTokenAmount(adjustedUsdIn, tokenIn.decimals, getMidPrice(tokenIn.prices))!;

    const adjustedExternalSwapQuoteForCombinedSwap = getExternalSwapQuoteByPath({
      amountIn: adjustedAmountIn,
      externalSwapPath: suitableSwapPath,
      externalSwapQuoteParams,
    });

    if (!adjustedExternalSwapQuoteForCombinedSwap) {
      return defaultSwapStrategy;
    }

    const adjustedSwapPathStatsForCombinedSwap = findSwapPathForSuitableSwapPath(
      adjustedExternalSwapQuoteForCombinedSwap.usdOut
    );

    if (!adjustedSwapPathStatsForCombinedSwap) {
      return defaultSwapStrategy;
    }

    return {
      type: "combinedSwap",
      externalSwapQuote: adjustedExternalSwapQuoteForCombinedSwap,
      swapPathStats: adjustedSwapPathStatsForCombinedSwap,
      amountIn: adjustedAmountIn,
      amountOut: adjustedSwapPathStatsForCombinedSwap.amountOut,
      usdIn: adjustedExternalSwapQuoteForCombinedSwap.usdIn,
      usdOut: adjustedSwapPathStatsForCombinedSwap.usdOut,
      priceIn: adjustedExternalSwapQuoteForCombinedSwap.priceIn,
      priceOut: priceOut,
      feesUsd: adjustedExternalSwapQuoteForCombinedSwap.usdIn - adjustedSwapPathStatsForCombinedSwap.usdOut,
    };
  }

  return defaultSwapStrategy;
}
