import { MarketsFeesConfigsData, SwapPathStats } from "domain/synthetics/fees";
import { MarketsData, MarketsPoolsData } from "domain/synthetics/markets";
import {
  TokenData,
  TokensData,
  TokensRatio,
  convertToTokenAmount,
  convertToUsd,
  getAmountByRatio,
  getTokenData,
} from "domain/synthetics/tokens";
import { SwapAmounts } from "domain/synthetics/trade";
import { BigNumber } from "ethers";

// TODO
// Acceptable price imapct
export function getSwapLimitAmounts(p: {}) {}

export function getSwapAmounts(p: {
  marketsData: MarketsData;
  poolsData: MarketsPoolsData;
  tokensData: TokensData;
  feesConfigs: MarketsFeesConfigsData;
  fromToken: TokenData;
  toToken: TokenData;
  fromAmount?: BigNumber;
  toAmount?: BigNumber;
  triggerRatio?: TokensRatio;
  findSwapPath: (usdIn: BigNumber) => SwapPathStats | undefined;
}): SwapAmounts | undefined {
  const fromToken = getTokenData(p.tokensData, p.fromToken?.address, "wrapped")!;
  const toToken = getTokenData(p.tokensData, p.toToken?.address, "wrapped")!;

  const defaultAmounts: SwapAmounts = {
    amountIn: BigNumber.from(0),
    amountOut: BigNumber.from(0),
    usdIn: BigNumber.from(0),
    usdOut: BigNumber.from(0),
  };

  if (!fromToken.prices || !toToken.prices) {
    return undefined;
  }

  if (!p.toAmount) {
    // calculate toAmount by fromAmount
    const fromAmount = p.fromAmount;
    const fromUsd = convertToUsd(fromAmount, fromToken.decimals, fromToken.prices.minPrice)!;
    let toAmount = BigNumber.from(0);
    let toUsd = BigNumber.from(0);

    if (!fromAmount?.gt(0)) {
      return defaultAmounts;
    }

    // disable price impact for limit swaps?
    const swapPathStats = p.findSwapPath(fromUsd);

    toUsd = swapPathStats?.usdOut || toUsd;
    toAmount = convertToTokenAmount(toUsd, toToken.decimals, toToken.prices.maxPrice)!;

    if (p.triggerRatio) {
      // include fees?
      toAmount = getAmountByRatio({
        fromToken: fromToken,
        toToken: toToken,
        fromTokenAmount: fromAmount,
        ratio: p.triggerRatio.ratio,
        invertRatio: p.triggerRatio.largestAddress === toToken.address,
      });

      toUsd = convertToUsd(toAmount, toToken.decimals, toToken.prices!.maxPrice)!;
    }

    return {
      amountIn: fromAmount,
      amountOut: toAmount,
      usdIn: fromUsd,
      usdOut: toUsd,
      swapPathStats: swapPathStats,
    };
  } else {
    // calculate fromAmount by toAmount
    const toAmount = p.toAmount;
    const toUsd = convertToUsd(toAmount, toToken.decimals, toToken.prices.minPrice)!;
    let fromUsd = toUsd;
    let fromAmount = convertToTokenAmount(fromUsd, fromToken.decimals, fromToken.prices.maxPrice)!;

    if (!toAmount.gt(0)) {
      return defaultAmounts;
    }

    const swapPathStats = p.findSwapPath(fromUsd);

    const adjustedFromUsd = swapPathStats?.usdOut.gt(0)
      ? fromUsd.mul(toUsd).div(swapPathStats.usdOut)
      : BigNumber.from(0);

    fromUsd = adjustedFromUsd;
    fromAmount = convertToTokenAmount(fromUsd, fromToken.decimals, fromToken.prices.maxPrice)!;

    if (p.triggerRatio) {
      fromAmount = getAmountByRatio({
        fromToken: toToken,
        toToken: fromToken,
        fromTokenAmount: toAmount,
        ratio: p.triggerRatio.ratio,
        invertRatio: p.triggerRatio.largestAddress === fromToken.address,
      });

      fromUsd = convertToUsd(toAmount, fromToken.decimals, fromToken.prices!.minPrice)!;
    }

    return {
      amountIn: fromAmount,
      amountOut: toAmount,
      usdIn: fromUsd,
      usdOut: toUsd,
    };
  }
}
