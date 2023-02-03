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
import { applyFactor, getBasisPoints } from "lib/numbers";
import { getMarketFeesConfig } from ".";
import { FeeItem, MarketsFeesConfigsData, SwapFeeItem, SwapPathStats, SwapStats } from "../types";
import { applySwapImpactWithCap, getPriceImpactForSwap } from "./priceImpact";

export function getSwapPathStats(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  openInterestData: MarketsOpenInterestData,
  tokensData: TokensData,
  feesConfigs: MarketsFeesConfigsData,
  swapPath: string[],
  tokenInAddress: string,
  usdIn: BigNumber
) {
  if (!swapPath?.length || !tokenInAddress || !usdIn) return undefined;

  const swapSteps: SwapStats[] = [];
  const swapFeeItems: SwapFeeItem[] = [];

  let usdOut = usdIn;
  let tokenOutAddress = tokenInAddress;

  let totalPriceImpactDeltaUsd = BigNumber.from(0);
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

    totalPriceImpactDeltaUsd = totalPriceImpactDeltaUsd.add(swapStep.priceImpactDeltaUsd);
    totalSwapFeeUsd = totalSwapFeeUsd.add(swapStep.swapFeeUsd);

    const swapFeeItem: SwapFeeItem = {
      marketAddress: swapStep.marketAddress,
      tokenInAddress: swapStep.tokenInAddress,
      tokenOutAddress: swapStep.tokenOutAddress,
      deltaUsd: swapStep.swapFeeUsd.mul(-1),
      bps: getBasisPoints(swapStep.swapFeeUsd.mul(-1), usdIn),
    };

    swapSteps.push(swapStep);
    swapFeeItems.push(swapFeeItem);
  }

  const totalPriceImpact: FeeItem = {
    deltaUsd: totalPriceImpactDeltaUsd,
    bps: getBasisPoints(totalPriceImpactDeltaUsd, usdIn),
  };

  const totalSwapFee: FeeItem = {
    deltaUsd: totalSwapFeeUsd.mul(-1),
    bps: getBasisPoints(totalSwapFeeUsd.mul(-1), usdIn),
  };

  const totalFeeDeltaUsd = totalPriceImpact.deltaUsd.add(totalSwapFee.deltaUsd);

  const totalFee: FeeItem = {
    deltaUsd: totalFeeDeltaUsd,
    bps: getBasisPoints(totalFeeDeltaUsd, usdIn),
  };

  const swapPathStats: SwapPathStats = {
    swapSteps,
    swapFees: swapFeeItems,
    totalPriceImpact,
    totalSwapFee,
    totalFee,
    tokenInAddress,
    tokenOutAddress,
    usdOut,
  };

  return swapPathStats;
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
