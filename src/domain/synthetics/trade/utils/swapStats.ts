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
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";

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
      e.to,
      usdIn
    );

    const isOutLiquidity = swapStats?.isOutLiquidity;
    const usdOut = swapStats?.usdOut;

    if (!usdOut || isOutLiquidity) {
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
  chainId: number,
  marketsData: MarketsData,
  poolsData: MarketsPoolsData,
  openInterestData: MarketsOpenInterestData,
  tokensData: TokensData,
  feesConfigs: MarketsFeesConfigsData,
  swapPath: string[],
  tokenInAddress: string,
  tokenOutAddress: string,
  usdIn: BigNumber,
  opts: { disablePriceImpact?: boolean } = {}
): SwapPathStats | undefined {
  const swapSteps: SwapStats[] = [];

  let usdOut = usdIn;
  let _tokenInAddress = tokenInAddress;
  let _tokenOutAddress: string;

  let totalSwapPriceImpactDeltaUsd = BigNumber.from(0);
  let totalSwapFeeUsd = BigNumber.from(0);

  for (let i = 0; i < swapPath.length; i++) {
    const marketAddress = swapPath[i];
    const market = getMarket(marketsData, marketAddress);

    if (i < swapPath.length - 1) {
      _tokenOutAddress = getOppositeCollateral(market, convertTokenAddress(chainId, _tokenInAddress, "wrapped"))!;
    } else {
      _tokenOutAddress = tokenOutAddress;
    }

    const swapStep = getSwapStats(
      marketsData,
      poolsData,
      openInterestData,
      tokensData,
      feesConfigs,
      marketAddress,
      _tokenInAddress,
      _tokenOutAddress,
      usdOut,
      opts
    );

    if (!swapStep) return undefined;

    _tokenInAddress = swapStep?.tokenOutAddress;
    usdOut = swapStep?.usdOut;

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
  tokenOutAddress: string,
  usdIn: BigNumber,
  opts: {
    disablePriceImpact?: boolean;
  } = {}
): SwapStats | undefined {
  const { disablePriceImpact = false } = opts;
  const market = getMarket(marketsData, marketAddress);
  const feeConfig = getMarketFeesConfig(feesConfigs, marketAddress);

  const isWrap = tokenInAddress === NATIVE_TOKEN_ADDRESS;
  const isUnwrap = tokenOutAddress === NATIVE_TOKEN_ADDRESS;

  const tokenIn = getTokenData(tokensData, tokenInAddress, "wrapped");
  const tokenOut = getTokenData(tokensData, tokenOutAddress, "wrapped");

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
    tokenIn.address,
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
      tokenOut.address,
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
      tokenIn.address,
      priceImpactDeltaUsd
    );

    if (!negativeImpactAmount) return undefined;

    cappedImpactDeltaUsd = convertToUsd(negativeImpactAmount, tokenIn.decimals, priceIn)!;
  }

  if (!disablePriceImpact) {
    usdOut = usdOut.add(cappedImpactDeltaUsd);
  }

  amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, priceOut)!;

  const liquidity = getAvailableUsdLiquidityForCollateral(
    marketsData,
    poolsData,
    openInterestData,
    tokensData,
    marketAddress,
    tokenOut.address
  );

  const isOutLiquidity = !liquidity || liquidity.lt(usdOut);

  const totalFeeDeltaUsd = swapFeeUsd.mul(-1).add(cappedImpactDeltaUsd);

  return {
    swapFeeUsd,
    swapFeeAmount,
    totalFeeDeltaUsd,
    isWrap,
    isUnwrap,
    marketAddress: market.marketTokenAddress,
    tokenInAddress,
    tokenOutAddress,
    priceImpactDeltaUsd: cappedImpactDeltaUsd,
    amountIn,
    amountInAfterFees,
    amountOut,
    usdOut,
    isOutLiquidity,
  };
}
