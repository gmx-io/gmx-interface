import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";
import { MarketsInfoData } from "types/markets";
import { SwapPricingType } from "types/orders";
import { InternalSwapStrategy, NoSwapStrategy } from "types/swapStrategy";
import type { TokenData, TokensRatio } from "types/tokens";
import type { FindSwapPath, SwapAmounts, SwapOptimizationOrderArray } from "types/trade";
import { ExternalSwapQuoteParams, SwapRoute } from "types/trade";
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

import { buildReverseSwapStrategy, buildSwapStrategy } from "./buildSwapStrategy";

export function getSwapAmountsByFromValue(p: {
  tokenIn: TokenData;
  tokenOut: TokenData;
  amountIn: bigint;
  triggerRatio?: TokensRatio;
  isLimit: boolean;
  swapOptimizationOrder?: SwapOptimizationOrderArray;
  allowedSwapSlippageBps?: bigint;
  uiFeeFactor: bigint;
  marketsInfoData: MarketsInfoData | undefined;
  chainId: number;
  externalSwapQuoteParams: ExternalSwapQuoteParams | undefined;
  findSwapPath: FindSwapPath;
}): SwapAmounts {
  const {
    tokenIn,
    tokenOut,
    amountIn,
    triggerRatio,
    isLimit,
    swapOptimizationOrder,
    uiFeeFactor,
    allowedSwapSlippageBps,
    marketsInfoData,
    chainId,
    externalSwapQuoteParams,
  } = p;

  if (!externalSwapQuoteParams) {
    return getSwapAmountsByFromValueDefault(p);
  }

  const swapStrategy = buildSwapStrategy({
    amountIn,
    tokenIn,
    tokenOut,
    marketsInfoData,
    chainId,
    swapOptimizationOrder,
    externalSwapQuoteParams,
    swapPricingType: SwapPricingType.Swap,
  });

  const swapPathStats = swapStrategy.swapPathStats;

  const totalSwapVolume = getTotalSwapVolumeFromSwapStats(swapPathStats?.swapSteps);
  const swapUiFeeUsd = applyFactor(totalSwapVolume, uiFeeFactor);
  const swapUiFeeAmount = convertToTokenAmount(swapUiFeeUsd, tokenOut.decimals, swapStrategy.priceOut)!;

  const defaultAmounts: SwapAmounts = {
    amountIn,
    usdIn: swapStrategy.usdIn,
    amountOut: swapStrategy.amountOut,
    usdOut: swapStrategy.usdOut,
    minOutputAmount: swapStrategy.amountOut,
    priceIn: swapStrategy.priceIn,
    priceOut: swapStrategy.priceOut,
    swapStrategy,
  };

  let amountOut = swapStrategy.amountOut;
  let usdOut = swapStrategy.usdOut;
  let minOutputAmount = 0n;

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

    usdOut = convertToUsd(amountOut, tokenOut.decimals, swapStrategy.priceOut)!;
    amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, swapStrategy.priceOut)!;
    minOutputAmount = amountOut;
  } else {
    usdOut = swapStrategy.usdOut - swapUiFeeUsd;
    amountOut = swapStrategy.amountOut - swapUiFeeAmount;
    minOutputAmount = amountOut;
  }

  if (amountOut < 0) {
    amountOut = 0n;
    usdOut = 0n;
    minOutputAmount = 0n;
  }

  return {
    amountIn,
    usdIn: swapStrategy.usdIn,
    amountOut,
    usdOut,
    priceIn: swapStrategy.priceIn,
    priceOut: swapStrategy.priceOut,
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
  swapOptimizationOrder?: SwapOptimizationOrderArray;
  allowedSwapSlippageBps?: bigint;
  uiFeeFactor: bigint;
  marketsInfoData: MarketsInfoData | undefined;
  chainId: number;
  externalSwapQuoteParams: ExternalSwapQuoteParams | undefined;
  findSwapPath: FindSwapPath;
}): SwapAmounts {
  const {
    tokenIn,
    tokenOut,
    amountOut,
    triggerRatio,
    isLimit,
    uiFeeFactor,
    swapOptimizationOrder,
    allowedSwapSlippageBps,
    marketsInfoData,
    chainId,
    externalSwapQuoteParams,
  } = p;

  if (!externalSwapQuoteParams) {
    return getSwapAmountsByToValueDefault(p);
  }

  const swapStrategyReverse = buildReverseSwapStrategy({
    amountOut,
    tokenIn,
    tokenOut,
    marketsInfoData,
    chainId,
    externalSwapQuoteParams,
    swapOptimizationOrder,
    swapPricingType: SwapPricingType.Swap,
  });

  const swapStrategy = buildSwapStrategy({
    amountIn: swapStrategyReverse.amountIn,
    tokenIn,
    tokenOut,
    marketsInfoData,
    chainId,
    swapOptimizationOrder,
    externalSwapQuoteParams,
    swapPricingType: SwapPricingType.Swap,
  });

  const uiFeeUsd = applyFactor(swapStrategy.usdIn, uiFeeFactor);

  const defaultAmounts: SwapAmounts = {
    amountIn: swapStrategy.amountIn,
    usdIn: swapStrategy.usdIn,
    amountOut: swapStrategy.amountOut,
    usdOut: swapStrategy.usdOut,
    minOutputAmount: swapStrategy.amountOut,
    priceIn: swapStrategy.priceIn,
    priceOut: swapStrategy.priceOut,
    swapStrategy,
  };

  if (!swapStrategy.swapPathStats) {
    return defaultAmounts;
  }

  let amountIn = swapStrategy.amountIn;
  let usdIn = swapStrategy.usdIn;

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

    usdIn = convertToUsd(amountIn, tokenIn.decimals, swapStrategy.priceIn)!;
    if (allowedSwapSlippageBps !== undefined) {
      usdIn += bigMath.mulDiv(usdIn, allowedSwapSlippageBps ?? 0n, BASIS_POINTS_DIVISOR_BIGINT);
    }
    amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, swapStrategy.priceIn)!;
  } else {
    usdIn = swapStrategy.usdIn + uiFeeUsd;
    amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, swapStrategy.priceIn)!;
  }

  let minOutputAmount = amountOut;

  if (amountIn < 0) {
    amountIn = 0n;
    usdIn = 0n;
    minOutputAmount = 0n;
  }

  return {
    amountIn,
    amountOut: swapStrategy.amountOut,
    usdIn: swapStrategy.usdIn,
    minOutputAmount,
    usdOut: swapStrategy.usdOut,
    priceIn: swapStrategy.priceIn,
    priceOut: swapStrategy.priceOut,
    swapStrategy: swapStrategy,
  };
}

function getSwapAmountsByFromValueDefault(p: {
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

  if (getIsEquivalentTokens(tokenIn, tokenOut)) {
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

function getSwapAmountsByToValueDefault(p: {
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

  if (getIsEquivalentTokens(tokenIn, tokenOut)) {
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

function getPlainSwapAmountsByFromToken(tokenIn: TokenData, tokenOut: TokenData, amountIn: bigint): SwapAmounts {
  const usdIn = convertToUsd(amountIn, tokenIn.decimals, tokenIn.prices.minPrice)!;
  const usdOut = usdIn;
  const amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, tokenOut.prices.maxPrice)!;
  const priceIn = tokenIn.prices.minPrice;
  const priceOut = tokenOut.prices.maxPrice;

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
    minOutputAmount: amountOut,
    priceIn,
    priceOut,
    swapStrategy,
  };
}

function getPlainSwapAmountsByToToken(tokenIn: TokenData, tokenOut: TokenData, amountOut: bigint): SwapAmounts {
  const priceIn = tokenIn.prices.minPrice;
  const priceOut = tokenOut.prices.maxPrice;
  const usdOut = convertToUsd(amountOut, tokenOut.decimals, priceOut)!;
  const usdIn = usdOut;
  const amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, priceIn)!;

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
    minOutputAmount: amountOut,
    priceIn,
    priceOut,
    swapStrategy,
  };
}
