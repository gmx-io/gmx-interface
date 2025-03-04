import { SwapRoute } from "types/trade";

import type { SwapAmounts } from "types/trade";
import type { FindSwapPath } from "types/trade";
import type { TokenData } from "types/tokens";
import type { TokensRatio } from "types/tokens";

import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";

import { applyFactor } from "utils/numbers";
import { bigMath } from "utils/bigmath";
import { convertToUsd, getIsEquivalentTokens, convertToTokenAmount, getAmountByRatio } from "utils/tokens";
import { getTotalSwapVolumeFromSwapStats } from "utils/fees";

export function getSwapAmountsByFromValue(p: {
  tokenIn: TokenData;
  tokenOut: TokenData;
  amountIn: bigint;
  triggerRatio?: TokensRatio;
  isLimit: boolean;
  swapOptimizationOrder?: Parameters<FindSwapPath>[1]["order"];
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
    });

    usdOut = convertToUsd(amountOut, tokenOut.decimals, priceOut)!;

    if (allowedSwapSlippageBps !== undefined) {
      usdOut -= bigMath.mulDiv(usdOut, allowedSwapSlippageBps ?? 0n, BASIS_POINTS_DIVISOR_BIGINT);
    } else {
      usdOut = usdOut - swapPathStats.totalSwapFeeUsd - swapUiFeeUsd + swapPathStats.totalSwapPriceImpactDeltaUsd;
    }

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
  swapOptimizationOrder?: Parameters<FindSwapPath>[1]["order"];
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

export function getSwapPathComparator(order: Parameters<FindSwapPath>[1]["order"]) {
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
