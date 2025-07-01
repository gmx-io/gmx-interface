import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";
import type { TokenData, TokensRatio } from "types/tokens";
import { SwapRoute } from "types/trade";
import type { FindSwapPath, SwapAmounts, SwapOptimizationOrderArray } from "types/trade";
import { bigMath } from "utils/bigmath";
import { getTotalSwapVolumeFromSwapStats } from "utils/fees";
import { applyFactor } from "utils/numbers";
import {
  convertToTokenAmount,
  convertToUsd,
  getAmountByRatio,
  getIsEquivalentTokens,
  getIsStake,
  getIsUnstake,
} from "utils/tokens";

export function getSwapAmountsByFromValue(p: {
  tokenIn: TokenData;
  tokenOut: TokenData;
  amountIn: bigint;
  triggerRatio?: TokensRatio;
  isLimit: boolean;
  swapOptimizationOrder?: SwapOptimizationOrderArray;
  allowedSwapSlippageBps?: bigint;
  findSwapPath: FindSwapPath;
  uiFeeFactor: bigint;
}): SwapAmounts {
  const {
    tokenIn,
    tokenOut,
    amountIn,
    triggerRatio,
    isLimit,
    swapOptimizationOrder,
    findSwapPath,
    uiFeeFactor,
    allowedSwapSlippageBps,
  } = p;

  const priceIn = tokenIn.prices.minPrice;
  const priceOut = tokenOut.prices.maxPrice;

  const usdIn = convertToUsd(amountIn, tokenIn.decimals, priceIn)!;

  let amountOut = 0n;
  let usdOut = 0n;
  let minOutputAmount = 0n;

  const defaultAmounts: SwapAmounts = {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    minOutputAmount,
    priceIn,
    priceOut,
    swapPathStats: undefined,
  };

  if (amountIn <= 0) {
    return defaultAmounts;
  }

  if (getIsEquivalentTokens(tokenIn, tokenOut)) {
    amountOut = amountIn;
    usdOut = usdIn;
    minOutputAmount = amountOut;

    return {
      amountIn,
      usdIn,
      amountOut,
      usdOut,
      minOutputAmount,
      priceIn,
      priceOut,
      swapPathStats: undefined,
    };
  }

  if (getIsStake(tokenIn, tokenOut) || getIsUnstake(tokenIn, tokenOut)) {
    return getPlainSwapAmountsByFromToken(tokenIn, tokenOut, amountIn);
  }

  const swapPathStats = findSwapPath(defaultAmounts.usdIn, { order: swapOptimizationOrder });

  const totalSwapVolume = getTotalSwapVolumeFromSwapStats(swapPathStats?.swapSteps);
  const swapUiFeeUsd = applyFactor(totalSwapVolume, uiFeeFactor);
  const swapUiFeeAmount = convertToTokenAmount(swapUiFeeUsd, tokenOut.decimals, priceOut)!;

  if (!swapPathStats) {
    return defaultAmounts;
  }

  if (isLimit) {
    if (!triggerRatio) {
      return defaultAmounts;
    }

    amountOut = getAmountByRatio({
      fromToken: tokenIn,
      toToken: tokenOut,
      fromTokenAmount: amountIn,
      ratio: triggerRatio.ratio,
      shouldInvertRatio: triggerRatio.largestToken.address === tokenOut.address,
      allowedSwapSlippageBps,
    });

    usdOut = convertToUsd(amountOut, tokenOut.decimals, priceOut)!;
    amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, priceOut)!;
    minOutputAmount = amountOut;
  } else {
    usdOut = swapPathStats.usdOut - swapUiFeeUsd;
    amountOut = swapPathStats.amountOut - swapUiFeeAmount;
    minOutputAmount = amountOut;
  }

  if (amountOut < 0) {
    amountOut = 0n;
    usdOut = 0n;
    minOutputAmount = 0n;
  }

  return {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    priceIn,
    priceOut,
    minOutputAmount,
    swapPathStats,
  };
}

export function getSwapAmountsByToValue(p: {
  tokenIn: TokenData;
  tokenOut: TokenData;
  amountOut: bigint;
  triggerRatio?: TokensRatio;
  isLimit: boolean;
  findSwapPath: FindSwapPath;
  swapOptimizationOrder?: SwapOptimizationOrderArray;
  allowedSwapSlippageBps?: bigint;
  uiFeeFactor: bigint;
}): SwapAmounts {
  const {
    tokenIn,
    tokenOut,
    amountOut,
    triggerRatio,
    isLimit,
    findSwapPath,
    uiFeeFactor,
    swapOptimizationOrder,
    allowedSwapSlippageBps,
  } = p;

  const priceIn = tokenIn.prices.minPrice;
  const priceOut = tokenOut.prices.maxPrice;

  const usdOut = convertToUsd(amountOut, tokenOut.decimals, priceOut)!;
  const uiFeeUsd = applyFactor(usdOut, uiFeeFactor);

  let minOutputAmount = amountOut;

  let amountIn = 0n;
  let usdIn = 0n;

  const defaultAmounts: SwapAmounts = {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    minOutputAmount,
    priceIn,
    priceOut,
    swapPathStats: undefined,
  };

  if (amountOut <= 0) {
    return defaultAmounts;
  }

  if (getIsEquivalentTokens(tokenIn, tokenOut)) {
    amountIn = amountOut;
    usdIn = usdOut;

    return {
      amountIn,
      usdIn,
      amountOut,
      usdOut,
      minOutputAmount,
      priceIn,
      priceOut,
      swapPathStats: undefined,
    };
  }

  if (getIsStake(tokenIn, tokenOut) || getIsUnstake(tokenIn, tokenOut)) {
    return getPlainSwapAmountsByToToken(tokenIn, tokenOut, amountOut);
  }

  const baseUsdIn = usdOut;
  const swapPathStats = findSwapPath(baseUsdIn, { order: swapOptimizationOrder });

  if (!swapPathStats) {
    return defaultAmounts;
  }

  if (isLimit) {
    if (!triggerRatio) {
      return defaultAmounts;
    }

    amountIn = getAmountByRatio({
      fromToken: tokenOut,
      toToken: tokenIn,
      fromTokenAmount: amountOut,
      ratio: triggerRatio.ratio,
      shouldInvertRatio: triggerRatio.largestToken.address === tokenIn.address,
    });

    usdIn = convertToUsd(amountIn, tokenIn.decimals, priceIn)!;
    if (allowedSwapSlippageBps !== undefined) {
      usdIn += bigMath.mulDiv(usdIn, allowedSwapSlippageBps ?? 0n, BASIS_POINTS_DIVISOR_BIGINT);
    } else {
      usdIn = usdIn + swapPathStats.totalSwapFeeUsd + uiFeeUsd - swapPathStats.totalSwapPriceImpactDeltaUsd;
    }
    amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, priceIn)!;
  } else {
    const adjustedUsdIn = swapPathStats.usdOut > 0 ? bigMath.mulDiv(baseUsdIn, usdOut, swapPathStats.usdOut) : 0n;

    usdIn = adjustedUsdIn + uiFeeUsd;
    amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, priceIn)!;
  }

  if (amountIn < 0) {
    amountIn = 0n;
    usdIn = 0n;
  }

  return {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    minOutputAmount,
    priceIn,
    priceOut,
    swapPathStats,
  };
}

export function getSwapPathComparator(order?: SwapOptimizationOrderArray | undefined) {
  return function (a: SwapRoute, b: SwapRoute) {
    for (const field of order || []) {
      const isLiquidity = field === "liquidity";
      const aVal = isLiquidity ? a.liquidity : a.path.length;
      const bVal = isLiquidity ? b.liquidity : b.path.length;

      if (aVal !== bVal) {
        if (isLiquidity) {
          return aVal < bVal ? 1 : -1;
        } else {
          return aVal < bVal ? -1 : 1;
        }
      }
    }

    return 0;
  };
}

function getPlainSwapAmountsByFromToken(tokenIn: TokenData, tokenOut: TokenData, amountIn: bigint): SwapAmounts {
  const usdIn = convertToUsd(amountIn, tokenIn.decimals, tokenIn.prices.minPrice)!;
  const usdOut = usdIn;
  const amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, tokenOut.prices.maxPrice)!;
  const priceIn = tokenIn.prices.minPrice;
  const priceOut = tokenOut.prices.maxPrice;

  return {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    minOutputAmount: amountOut,
    priceIn,
    priceOut,
    swapPathStats: undefined,
  };
}

function getPlainSwapAmountsByToToken(tokenIn: TokenData, tokenOut: TokenData, amountOut: bigint): SwapAmounts {
  const priceIn = tokenIn.prices.minPrice;
  const priceOut = tokenOut.prices.maxPrice;
  const usdOut = convertToUsd(amountOut, tokenOut.decimals, priceOut)!;
  const usdIn = usdOut;
  const amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, priceIn)!;

  return {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    minOutputAmount: amountOut,
    priceIn,
    priceOut,
    swapPathStats: undefined,
  };
}
