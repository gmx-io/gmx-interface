import { TokenData, TokensRatio, convertToTokenAmount, convertToUsd, getAmountByRatio } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { FindSwapPath, SwapAmounts } from "../types";
import { getIsEquivalentTokens } from "domain/tokens";
import { getTotalSwapVolumeFromSwapStats } from "domain/synthetics/fees";
import { applyFactor } from "lib/numbers";

export function getSwapAmountsByFromValue(p: {
  tokenIn: TokenData;
  tokenOut: TokenData;
  amountIn: bigint;
  triggerRatio?: TokensRatio;
  isLimit: boolean;
  findSwapPath: FindSwapPath;
  uiFeeFactor: bigint;
}): SwapAmounts {
  const { tokenIn, tokenOut, amountIn, triggerRatio, isLimit, findSwapPath, uiFeeFactor } = p;

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

  if (amountIn.lte(0)) {
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

  const swapPathStats = findSwapPath(defaultAmounts.usdIn, { byLiquidity: isLimit });

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
    usdOut = usdOut
      .sub(swapPathStats.totalSwapFeeUsd)
      .sub(swapUiFeeUsd)
      .add(swapPathStats.totalSwapPriceImpactDeltaUsd);
    amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, priceOut)!;
    minOutputAmount = amountOut;
  } else {
    usdOut = swapPathStats.usdOut.sub(swapUiFeeUsd);
    amountOut = swapPathStats.amountOut.sub(swapUiFeeAmount);
    minOutputAmount = amountOut;
  }

  if (amountOut.lt(0)) {
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
  uiFeeFactor: bigint;
}): SwapAmounts {
  const { tokenIn, tokenOut, amountOut, triggerRatio, isLimit, findSwapPath, uiFeeFactor } = p;

  const priceIn = tokenIn.prices.minPrice;
  const priceOut = tokenOut.prices.maxPrice;

  const usdOut = convertToUsd(amountOut, tokenOut.decimals, priceOut)!;
  const uiFeeUsd = applyFactor(usdOut, uiFeeFactor);

  const minOutputAmount = amountOut;

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

  if (amountOut.lte(0)) {
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
  const swapPathStats = findSwapPath(baseUsdIn, { byLiquidity: isLimit });

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
    usdIn = usdIn.add(swapPathStats.totalSwapFeeUsd).add(uiFeeUsd).sub(swapPathStats.totalSwapPriceImpactDeltaUsd);
    amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, priceIn)!;
  } else {
    const adjustedUsdIn = swapPathStats.usdOut.gt(0) ? baseUsdIn.mul(usdOut).div(swapPathStats.usdOut) : 0n;

    usdIn = adjustedUsdIn.add(uiFeeUsd);
    amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, priceIn)!;
  }

  if (amountIn.lt(0)) {
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
