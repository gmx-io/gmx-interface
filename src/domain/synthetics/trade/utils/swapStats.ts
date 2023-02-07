import {
  MarketsData,
  MarketsOpenInterestData,
  MarketsPoolsData,
  getAvailableUsdLiquidityForCollateral,
  getMarket,
  getOppositeCollateral,
} from "domain/synthetics/markets";
import { TokensData, convertToTokenAmount, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { applyFactor } from "lib/numbers";
import { MarketsFeesConfigsData } from "../../fees/types";
import { getMarketFeesConfig } from "../../fees/utils";
import { applySwapImpactWithCap, getPriceImpactForSwap } from "../../fees/utils/priceImpact";
import { MarketEdge, SwapEstimator, SwapPathStats, SwapStats } from "../types";

export const createSwapEstimator = (
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  openInterestData: MarketsOpenInterestData,
  tokensData: TokensData,
  feeConfigs: MarketsFeesConfigsData
): SwapEstimator => {
  return (e: MarketEdge, usdIn: BigNumber) => {
    const swapStats = getSwapStats(
      marketsData,
      poolsData,
      openInterestData,
      tokensData,
      feeConfigs,
      e.marketAddress,
      e.from,
      usdIn
    );

    const usdOut = swapStats?.usdOut;

    if (!usdOut) {
      return {
        usdOut: BigNumber.from(0),
      };
    }

    return {
      usdOut,
    };
  };
};

export function getSwapPathStats(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  openInterestData: MarketsOpenInterestData,
  tokensData: TokensData,
  feesConfigs: MarketsFeesConfigsData,
  swapPath: string[],
  tokenInAddress: string,
  usdIn: BigNumber
): SwapPathStats | undefined {
  const swapSteps: SwapStats[] = [];

  let usdOut = usdIn;
  let tokenOutAddress = tokenInAddress;

  let totalSwapPriceImpactDeltaUsd = BigNumber.from(0);
  let totalSwapFeeUsd = BigNumber.from(0);

  for (let i = 0; i < swapPath.length; i++) {
    const marketAddress = swapPath[i];

    const swapStep = getSwapStats(
      marketsData,
      poolsData,
      openInterestData,
      tokensData,
      feesConfigs,
      marketAddress,
      tokenOutAddress,
      usdOut
    );

    if (!swapStep) return undefined;

    usdOut = swapStep?.usdOut;
    tokenOutAddress = swapStep?.tokenOutAddress;

    totalSwapPriceImpactDeltaUsd = totalSwapPriceImpactDeltaUsd.add(swapStep.priceImpactDeltaUsd);
    totalSwapFeeUsd = totalSwapFeeUsd.add(swapStep.swapFeeUsd);

    swapSteps.push(swapStep);
  }

  const lastStep = swapSteps[swapSteps.length - 1];

  const targetMarketAddress = lastStep?.marketAddress;
  const amountOut = lastStep?.amountOut;

  const totalFeesDeltaUsd = BigNumber.from(0).sub(totalSwapFeeUsd).add(totalSwapPriceImpactDeltaUsd);

  return {
    swapPath,
    tokenInAddress,
    tokenOutAddress,
    targetMarketAddress,
    swapSteps,
    usdOut,
    amountOut,
    totalSwapFeeUsd,
    totalSwapPriceImpactDeltaUsd,
    totalFeesDeltaUsd,
  };
}

export function getSwapStats(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  openInterestData: MarketsOpenInterestData,
  tokensData: TokensData,
  feesConfigs: MarketsFeesConfigsData,
  marketAddress: string,
  tokenInAddress: string,
  usdIn: BigNumber
) {
  const market = getMarket(marketsData, marketAddress);
  const feeConfig = getMarketFeesConfig(feesConfigs, marketAddress);

  const tokenOutAddress = getOppositeCollateral(market, tokenInAddress);

  const tokenIn = getTokenData(tokensData, tokenInAddress);
  const tokenOut = getTokenData(tokensData, tokenOutAddress);

  const priceIn = tokenIn?.prices?.minPrice;
  const priceOut = tokenOut?.prices?.maxPrice;

  if (!market || !feeConfig || !priceIn || !priceOut) return undefined;

  const amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, priceIn)!;

  const swapFeeAmount = applyFactor(amountIn, feeConfig.swapFeeFactor);
  const swapFeeUsd = convertToUsd(swapFeeAmount, tokenIn.decimals, priceIn)!;

  const amountInAfterFees = amountIn.sub(swapFeeAmount);
  const usdInAfterFees = usdIn.sub(swapFeeUsd);

  let usdOut = usdInAfterFees;
  let amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, priceOut)!;

  const priceImpactDeltaUsd = getPriceImpactForSwap(
    marketsData,
    poolsData,
    tokensData,
    feesConfigs,
    marketAddress,
    tokenInAddress,
    amountInAfterFees,
    amountOut.mul(-1)
  );

  if (!priceImpactDeltaUsd) return undefined;

  let cappedImpactDeltaUsd: BigNumber;

  if (priceImpactDeltaUsd.gt(0)) {
    const positiveImpactAmount = applySwapImpactWithCap(
      marketsData,
      poolsData,
      tokensData,
      marketAddress,
      tokenOutAddress,
      priceImpactDeltaUsd
    );

    if (!positiveImpactAmount) return undefined;

    cappedImpactDeltaUsd = convertToUsd(positiveImpactAmount, tokenOut.decimals, priceOut)!;
  } else {
    const negativeImpactAmount = applySwapImpactWithCap(
      marketsData,
      poolsData,
      tokensData,
      marketAddress,
      tokenInAddress,
      priceImpactDeltaUsd
    );

    if (!negativeImpactAmount) return undefined;

    cappedImpactDeltaUsd = convertToUsd(negativeImpactAmount, tokenIn.decimals, priceIn)!;
  }

  usdOut = usdOut.add(cappedImpactDeltaUsd);
  amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, priceOut)!;

  // TODO: error?
  const outLiquidity = getAvailableUsdLiquidityForCollateral(
    marketsData,
    poolsData,
    openInterestData,
    tokensData,
    marketAddress,
    tokenOutAddress
  );

  if (!outLiquidity || outLiquidity.lt(usdOut)) {
    usdOut = BigNumber.from(0);
  }

  const totalFeeDeltaUsd = swapFeeUsd.mul(-1).add(cappedImpactDeltaUsd);

  return {
    swapFeeUsd,
    swapFeeAmount,
    totalFeeDeltaUsd,
    marketAddress: market.marketTokenAddress,
    tokenInAddress: tokenIn.address,
    tokenOutAddress: tokenOut.address,
    priceImpactDeltaUsd: cappedImpactDeltaUsd,
    amountIn,
    amountInAfterFees,
    amountOut,
    usdOut,
  };
}
