import { TokenData, TokensRatio, convertToTokenAmount, convertToUsd, getAmountByRatio } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { SwapAmounts, SwapPathStats, SwapTradeParams } from "../types";
import { getDisplayedTradeFees } from "./common";

export function getSwapTradeParams(p: {
  tokenIn: TokenData;
  tokenOut: TokenData;
  tokenInAmount?: BigNumber;
  tokenOutAmount?: BigNumber;
  triggerRatio?: TokensRatio;
  isLimit?: boolean;
  findSwapPath: (usdIn: BigNumber, opts?: { disablePriceImpact?: boolean }) => SwapPathStats | undefined;
}): SwapTradeParams | undefined {
  const swapAmounts = getSwapAmounts(p);

  if (!swapAmounts) {
    return undefined;
  }

  const fees = getDisplayedTradeFees({
    initialCollateralUsd: swapAmounts.usdIn,
    swapSteps: swapAmounts.swapPathStats?.swapSteps,
    swapPriceImpactDeltaUsd: !p.isLimit ? swapAmounts.swapPathStats?.totalSwapPriceImpactDeltaUsd : undefined,
  });

  return {
    ...swapAmounts,
    tokenIn: p.tokenIn,
    tokenOut: p.tokenOut,
    tokenInPrice: p.tokenIn.prices?.maxPrice!,
    tokenOutPrice: p.tokenOut.prices?.minPrice!,
    triggerRatio: p.triggerRatio,
    fees,
  };
}

/**
 * Calculates swap amounts (amountOut by amountIn or amountIn by amountOut)
 */
export function getSwapAmounts(p: {
  tokenIn?: TokenData;
  tokenOut?: TokenData;
  tokenInAmount?: BigNumber;
  tokenOutAmount?: BigNumber;
  triggerRatio?: TokensRatio;
  isLimit?: boolean;
  findSwapPath: (usdIn: BigNumber, opts?: { disablePriceImpact?: boolean }) => SwapPathStats | undefined;
}): SwapAmounts | undefined {
  const { tokenIn, tokenOut } = p;

  const defaultAmounts: SwapAmounts = {
    amountIn: BigNumber.from(0),
    amountOut: BigNumber.from(0),
    usdIn: BigNumber.from(0),
    usdOut: BigNumber.from(0),
    minOutputAmount: BigNumber.from(0),
  };

  if (!tokenIn?.prices || !tokenOut?.prices) {
    return undefined;
  }

  if (!p.tokenOutAmount) {
    // calculate amountOut by amountIn
    const amountIn = p.tokenInAmount;
    const usdIn = convertToUsd(amountIn, tokenIn.decimals, tokenIn.prices.minPrice)!;
    let amountOut = BigNumber.from(0);
    let usdOut = BigNumber.from(0);

    if (!amountIn?.gt(0)) {
      return defaultAmounts;
    }

    const swapPathStats = p.findSwapPath(usdIn, {
      disablePriceImpact: p.isLimit,
    });

    usdOut = swapPathStats?.usdOut || usdOut;
    amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, tokenOut.prices.maxPrice)!;

    if (p.isLimit && p.triggerRatio) {
      amountOut = getAmountByRatio({
        fromToken: tokenIn,
        toToken: tokenOut,
        fromTokenAmount: amountIn,
        ratio: p.triggerRatio.ratio,
        invertRatio: p.triggerRatio.largestAddress === tokenOut.address,
      });

      usdOut = convertToUsd(amountOut, tokenOut.decimals, tokenOut.prices!.maxPrice)!;
    }

    let minOutputAmount = amountOut;

    if (swapPathStats?.totalFeesDeltaUsd.gt(0)) {
      const minOutputUsd = usdOut.sub(swapPathStats.totalFeesDeltaUsd);
      minOutputAmount = convertToTokenAmount(minOutputUsd, tokenOut.decimals, tokenOut.prices.maxPrice)!;
    } else {
      const minOutputUsd = usdOut.add(swapPathStats?.totalFeesDeltaUsd || 0);
      minOutputAmount = convertToTokenAmount(minOutputUsd, tokenOut.decimals, tokenOut.prices.maxPrice)!;
    }

    return {
      amountIn,
      amountOut,
      usdIn,
      usdOut,
      swapPathStats: swapPathStats,
      minOutputAmount,
    };
  } else {
    const amountOut = p.tokenOutAmount;
    const usdOut = convertToUsd(amountOut, tokenOut.decimals, tokenOut.prices.minPrice)!;
    let usdIn = usdOut;
    let amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, tokenIn.prices.maxPrice)!;

    if (!amountOut.gt(0)) {
      return defaultAmounts;
    }

    const swapPathStats = p.findSwapPath(usdIn, { disablePriceImpact: p.isLimit });

    const adjustedUsdIn = swapPathStats?.usdOut.gt(0) ? usdIn.mul(usdOut).div(swapPathStats.usdOut) : usdIn;

    usdIn = adjustedUsdIn;
    amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, tokenIn.prices.maxPrice)!;

    if (p.isLimit && p.triggerRatio) {
      amountIn = getAmountByRatio({
        fromToken: tokenOut,
        toToken: tokenIn,
        fromTokenAmount: amountOut,
        ratio: p.triggerRatio.ratio,
        invertRatio: p.triggerRatio.largestAddress === tokenIn.address,
      });

      usdIn = convertToUsd(amountOut, tokenIn.decimals, tokenIn.prices!.minPrice)!;
    }

    // TODO: correction in case of unexact fees calculation
    let minOutputAmount = amountOut.sub(amountOut.div(3));

    return {
      amountIn,
      amountOut,
      usdIn,
      usdOut,
      swapPathStats,
      minOutputAmount,
    };
  }
}
