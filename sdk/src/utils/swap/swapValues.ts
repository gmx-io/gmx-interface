import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";
import { bigMath } from "utils/bigmath";
import { getTotalSwapVolumeFromSwapStats } from "utils/fees";
import { applyFactor } from "utils/numbers";
import { InternalSwapStrategy, NoSwapStrategy } from "utils/swap/types";
import {
  convertToTokenAmount,
  convertToUsd,
  getAmountByRatio,
  getIsEquivalentTokens,
  getIsUnwrap,
  getIsWrap,
} from "utils/tokens";
import type { TokenData, TokensRatio } from "utils/tokens/types";
import type { FindSwapPath, SwapAmounts, SwapOptimizationOrderArray } from "utils/trade/types";
import { SwapRoute } from "utils/trade/types";

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
  allowSameTokenSwap: boolean;
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
    allowSameTokenSwap,
  } = p;

  const priceIn = tokenIn.prices.minPrice;
  const priceOut = tokenOut.prices.maxPrice;

  const usdIn = convertToUsd(amountIn, tokenIn.decimals, priceIn)!;

  let amountOut = 0n;
  let usdOut = 0n;
  let minOutputAmount = 0n;

  const defaultSwapStrategy: NoSwapStrategy = {
    type: "noSwap",
    externalSwapQuote: undefined,
    swapPathStats: undefined,
    amountIn,
    amountOut,
    usdIn,
    usdOut,
    priceIn,
    priceOut,
    feesUsd: 0n,
  };

  const defaultAmounts: SwapAmounts = {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    minOutputAmount,
    priceIn,
    priceOut,
    swapStrategy: defaultSwapStrategy,
  };

  if (amountIn <= 0) {
    return defaultAmounts;
  }

  if (
    (!allowSameTokenSwap && getIsEquivalentTokens(tokenIn, tokenOut)) ||
    getIsWrap(tokenIn, tokenOut) ||
    getIsUnwrap(tokenIn, tokenOut)
  ) {
    amountOut = amountIn;
    usdOut = usdIn;
    minOutputAmount = amountOut;

    const swapStrategy: NoSwapStrategy = {
      type: "noSwap",
      externalSwapQuote: undefined,
      swapPathStats: undefined,
      amountIn,
      amountOut,
      usdIn,
      usdOut,
      priceIn,
      priceOut,
      feesUsd: 0n,
    };

    return {
      amountIn,
      usdIn,
      amountOut,
      usdOut,
      minOutputAmount,
      priceIn,
      priceOut,
      swapStrategy,
    };
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

  const swapStrategy: InternalSwapStrategy = {
    type: "internalSwap",
    externalSwapQuote: undefined,
    swapPathStats,
    amountIn,
    amountOut,
    usdIn,
    usdOut,
    priceIn,
    priceOut,
    feesUsd: usdIn - usdOut,
  };

  return {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    priceIn,
    priceOut,
    minOutputAmount,
    swapStrategy,
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
  allowSameTokenSwap: boolean;
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
    allowSameTokenSwap,
  } = p;

  const priceIn = tokenIn.prices.minPrice;
  const priceOut = tokenOut.prices.maxPrice;

  const usdOut = convertToUsd(amountOut, tokenOut.decimals, priceOut)!;
  const uiFeeUsd = applyFactor(usdOut, uiFeeFactor);

  let minOutputAmount = amountOut;

  let amountIn = 0n;
  let usdIn = 0n;

  const defaultSwapStrategy: NoSwapStrategy = {
    type: "noSwap",
    externalSwapQuote: undefined,
    swapPathStats: undefined,
    amountIn,
    amountOut,
    usdIn,
    usdOut,
    priceIn,
    priceOut,
    feesUsd: 0n,
  };

  const defaultAmounts: SwapAmounts = {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    minOutputAmount,
    priceIn,
    priceOut,
    swapStrategy: defaultSwapStrategy,
  };

  if (amountOut <= 0) {
    return defaultAmounts;
  }

  if (
    (!allowSameTokenSwap && getIsEquivalentTokens(tokenIn, tokenOut)) ||
    getIsWrap(tokenIn, tokenOut) ||
    getIsUnwrap(tokenIn, tokenOut)
  ) {
    amountIn = amountOut;
    usdIn = usdOut;

    const swapStrategy: NoSwapStrategy = {
      type: "noSwap",
      externalSwapQuote: undefined,
      swapPathStats: undefined,
      amountIn,
      amountOut,
      usdIn,
      usdOut,
      priceIn,
      priceOut,
      feesUsd: 0n,
    };

    return {
      amountIn,
      usdIn,
      amountOut,
      usdOut,
      minOutputAmount,
      priceIn,
      priceOut,
      swapStrategy,
    };
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

  const swapStrategy: InternalSwapStrategy = {
    type: "internalSwap",
    externalSwapQuote: undefined,
    swapPathStats,
    amountIn,
    amountOut,
    usdIn,
    usdOut,
    priceIn,
    priceOut,
    feesUsd: usdIn - usdOut,
  };

  return {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    minOutputAmount,
    priceIn,
    priceOut,
    swapStrategy,
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
