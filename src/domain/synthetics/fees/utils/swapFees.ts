import { MarketsData, MarketsPoolsData, getMarket, getOppositeCollateral } from "domain/synthetics/markets";
import { TokensData, convertToTokenAmount, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { applyFactor, getBasisPoints } from "lib/numbers";
import { getMarketFeesConfig } from ".";
import { FeeItem, MarketsFeesConfigsData, SwapFeeItem, SwapStepFees, TotalSwapFees } from "../types";
import { applySwapImpactWithCap, getPriceImpactForSwap } from "./priceImpact";
import { PRECISION } from "lib/legacy";

export function getTotalSwapFees(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  tokensData: TokensData,
  feesConfigs: MarketsFeesConfigsData,
  swapPath: string[] | undefined,
  tokenInAddress: string | undefined,
  usdIn: BigNumber | undefined
) {
  if (!swapPath?.length || !tokenInAddress || !usdIn) return undefined;

  const swapSteps: SwapStepFees[] = [];
  const swapFeeItems: SwapFeeItem[] = [];

  let usdOut = usdIn;
  let tokenOutAddress = tokenInAddress;

  let totalPriceImpactDeltaUsd = BigNumber.from(0);
  let totalSwapFeeUsd = BigNumber.from(0);

  for (let i = 0; i < swapPath.length; i++) {
    const marketAddress = swapPath[i];

    const swapStep = getSwapFees(
      marketsData,
      poolsData,
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

  const totalFees: TotalSwapFees = {
    swapSteps,
    swapFees: swapFeeItems,
    totalPriceImpact,
    totalSwapFee,
    totalFee,
    tokenInAddress,
    tokenOutAddress,
    usdOut,
  };

  return totalFees;
}

export function getTotalInvertedSwapFees(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  tokensData: TokensData,
  feesConfigs: MarketsFeesConfigsData,
  swapPath: string[] | undefined,
  tokenOutAddress: string | undefined,
  usdOut: BigNumber | undefined
) {
  if (!swapPath?.length || !tokenOutAddress || !usdOut) return undefined;

  const swapSteps: any[] = [];

  let usdIn = usdOut;
  let tokenInAddress = tokenOutAddress;

  for (const marketAddress of swapPath.reverse()) {
    const swapStep = getInvertedSwapFees(
      marketsData,
      poolsData,
      tokensData,
      feesConfigs,
      marketAddress,
      tokenInAddress,
      usdIn
    );

    if (!swapStep) return undefined;

    usdIn = swapStep?.usdIn;
    tokenOutAddress = swapStep?.tokenInAddress;

    swapSteps.push(swapStep);
  }

  const totalFees = {
    swapSteps,
    tokenInAddress,
    tokenOutAddress,
    usdIn,
  };

  return totalFees;
}

export function getSwapFees(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  tokensData: TokensData,
  feesConfigs: MarketsFeesConfigsData,
  marketAddress: string | undefined,
  tokenInAddress: string | undefined,
  usdIn: BigNumber | undefined
): SwapStepFees | undefined {
  const feeConfig = getMarketFeesConfig(feesConfigs, marketAddress);
  const market = getMarket(marketsData, marketAddress);
  const tokenOutAddress = getOppositeCollateral(market, tokenInAddress);

  const tokenIn = getTokenData(tokensData, tokenInAddress);
  const tokenOut = getTokenData(tokensData, tokenOutAddress);

  if (
    !usdIn ||
    !feeConfig ||
    !marketAddress ||
    !tokenInAddress ||
    !tokenOutAddress ||
    !tokenIn?.prices ||
    !tokenOut?.prices
  ) {
    return undefined;
  }

  const amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, tokenIn.prices.minPrice)!;

  const swapFeeAmount = applyFactor(amountIn, feeConfig.swapFeeFactor);
  const swapFeeUsd = convertToUsd(swapFeeAmount, tokenIn.decimals, tokenIn.prices.minPrice)!;
  const usdInAfterFees = usdIn.sub(swapFeeUsd);

  const amountInAfterFees = amountIn.sub(swapFeeAmount);

  let amountOut = convertToTokenAmount(usdInAfterFees, tokenOut.decimals, tokenOut.prices.maxPrice)!;

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

    cappedImpactDeltaUsd = convertToUsd(positiveImpactAmount, tokenOut.decimals, tokenOut.prices.maxPrice)!;

    amountOut = amountOut.add(positiveImpactAmount);
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

    cappedImpactDeltaUsd = convertToUsd(negativeImpactAmount, tokenIn.decimals, tokenIn.prices.minPrice)!;
    amountOut = amountOut.sub(
      convertToTokenAmount(cappedImpactDeltaUsd.mul(-1), tokenOut.decimals, tokenOut.prices.maxPrice)!
    );
  }

  if (amountOut.lt(0)) {
    amountOut = BigNumber.from(0);
  }

  const totalFeeUsd = swapFeeUsd.add(cappedImpactDeltaUsd);
  const usdOut = convertToUsd(amountOut, tokenOut.decimals, tokenOut.prices.maxPrice)!;

  return {
    swapFeeUsd,
    swapFeeAmount,
    totalFeeUsd,
    marketAddress,
    tokenInAddress,
    tokenOutAddress,
    priceImpactDeltaUsd: cappedImpactDeltaUsd,
    amountInAfterFees,
    amountOut,
    usdOut,
  };
}

export function getInvertedSwapFees(
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  tokensData: TokensData,
  feesConfigs: MarketsFeesConfigsData,
  marketAddress: string | undefined,
  tokenOutAddress: string | undefined,
  usdOut: BigNumber | undefined
) {
  const feeConfig = getMarketFeesConfig(feesConfigs, marketAddress);
  const market = getMarket(marketsData, marketAddress);
  const tokenInAddress = getOppositeCollateral(market, tokenOutAddress);

  const tokenOut = getTokenData(tokensData, tokenOutAddress);
  const tokenIn = getTokenData(tokensData, tokenInAddress);

  if (
    !usdOut ||
    !feeConfig ||
    !marketAddress ||
    !tokenInAddress ||
    !tokenOutAddress ||
    !tokenIn?.prices ||
    !tokenOut?.prices
  ) {
    return undefined;
  }

  const amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, tokenOut.prices.minPrice)!;
  let amountIn = convertToTokenAmount(usdOut, tokenIn.decimals, tokenIn.prices.maxPrice)!;

  const priceImpactDeltaUsd = getPriceImpactForSwap(
    marketsData,
    poolsData,
    tokensData,
    feesConfigs,
    marketAddress,
    tokenInAddress,
    amountIn,
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

    cappedImpactDeltaUsd = convertToUsd(positiveImpactAmount, tokenOut.decimals, tokenOut.prices.maxPrice)!;
    amountIn = amountIn.sub(convertToTokenAmount(cappedImpactDeltaUsd, tokenIn.decimals, tokenIn.prices.maxPrice)!);
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

    cappedImpactDeltaUsd = convertToUsd(negativeImpactAmount, tokenIn.decimals, tokenIn.prices.minPrice)!;

    amountIn = amountIn.add(negativeImpactAmount.mul(-1));
  }

  const swapFeeAmount = applyFactor(amountIn, PRECISION.mul(PRECISION).div(feeConfig.swapFeeFactor));
  amountIn = amountIn.add(swapFeeAmount);

  const usdIn = convertToUsd(amountIn, tokenIn.decimals, tokenIn.prices.minPrice)!;

  return {
    marketAddress,
    tokenInAddress,
    tokenOutAddress,
    priceImpactDeltaUsd: cappedImpactDeltaUsd,
    amountIn,
    usdIn,
  };
}
