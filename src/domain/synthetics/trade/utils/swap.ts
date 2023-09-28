import { TokenData, TokensRatio, convertToTokenAmount, convertToUsd, getAmountByRatio } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { FindSwapPath, SwapAmounts } from "../types";
import { getIsEquivalentTokens } from "domain/tokens";
import { applyFactor } from "lib/numbers";

export function getSwapAmountsByFromValue(p: {
  tokenIn: TokenData;
  tokenOut: TokenData;
  amountIn: BigNumber;
  triggerRatio?: TokensRatio;
  isLimit: boolean;
  findSwapPath: FindSwapPath;
  uiFeeFactor?: BigNumber;
}): SwapAmounts {
  const { tokenIn, tokenOut, amountIn, triggerRatio, isLimit, findSwapPath, uiFeeFactor } = p;

  const priceIn = tokenIn.prices.minPrice;
  const priceOut = tokenOut.prices.maxPrice;

  const usdIn = convertToUsd(amountIn, tokenIn.decimals, priceIn)!;
  const uiFeeUsd = uiFeeFactor?.gt(0) ? applyFactor(usdIn, uiFeeFactor) : undefined;

  let amountOut = BigNumber.from(0);
  let usdOut = BigNumber.from(0);
  let minOutputAmount = BigNumber.from(0);

  const defaultAmounts: SwapAmounts = {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    minOutputAmount,
    priceIn,
    priceOut,
    swapPathStats: undefined,
    uiFeeUsd,
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
      uiFeeUsd,
    };
  }

  const swapPathStats = findSwapPath(defaultAmounts.usdIn, { byLiquidity: isLimit });

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
    usdOut = usdOut.sub(swapPathStats.totalSwapFeeUsd).add(swapPathStats.totalSwapPriceImpactDeltaUsd);
    amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, priceOut)!;
    minOutputAmount = amountOut;
  } else {
    usdOut = swapPathStats.usdOut;
    amountOut = swapPathStats.amountOut;
    minOutputAmount = amountOut;
  }

  if (amountOut.lt(0)) {
    amountOut = BigNumber.from(0);
    usdOut = BigNumber.from(0);
    minOutputAmount = BigNumber.from(0);
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
    uiFeeUsd,
  };
}

export function getSwapAmountsByToValue(p: {
  tokenIn: TokenData;
  tokenOut: TokenData;
  amountOut: BigNumber;
  triggerRatio?: TokensRatio;
  isLimit: boolean;
  findSwapPath: FindSwapPath;
  uiFeeFactor?: BigNumber;
}): SwapAmounts {
  const { tokenIn, tokenOut, amountOut, triggerRatio, isLimit, findSwapPath, uiFeeFactor } = p;

  const priceIn = tokenIn.prices.minPrice;
  const priceOut = tokenOut.prices.maxPrice;

  const usdOut = convertToUsd(amountOut, tokenOut.decimals, priceOut)!;
  const minOutputAmount = amountOut;

  let amountIn = BigNumber.from(0);
  let usdIn = BigNumber.from(0);

  const uiFeeUsd = uiFeeFactor?.gt(0) ? applyFactor(usdIn, uiFeeFactor) : undefined;

  const defaultAmounts: SwapAmounts = {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    minOutputAmount,
    priceIn,
    priceOut,
    swapPathStats: undefined,
    uiFeeUsd,
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
      uiFeeUsd,
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
    usdIn = usdIn.add(swapPathStats.totalSwapFeeUsd).sub(swapPathStats.totalSwapPriceImpactDeltaUsd);
    amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, priceIn)!;
  } else {
    const adjustedUsdIn = swapPathStats.usdOut.gt(0)
      ? baseUsdIn.mul(usdOut).div(swapPathStats.usdOut)
      : BigNumber.from(0);

    usdIn = adjustedUsdIn;
    amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, priceIn)!;
  }

  if (amountIn.lt(0)) {
    amountIn = BigNumber.from(0);
    usdIn = BigNumber.from(0);
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
    uiFeeUsd,
  };
}
