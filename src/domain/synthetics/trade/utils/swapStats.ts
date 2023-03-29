import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";
import {
  MarketInfo,
  MarketsInfoData,
  getAvailableUsdLiquidityForCollateral,
  getMarketCollateralByAddress,
  getOppositeCollateral,
  getTokenPoolType,
} from "domain/synthetics/markets";
import { convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { applyFactor } from "lib/numbers";
import { applySwapImpactWithCap, getPriceImpactForSwap } from "../../fees/utils/priceImpact";
import { MarketEdge, SwapEstimator, SwapPathStats, SwapStats } from "../types";

export const createSwapEstimator = (marketsInfoData: MarketsInfoData): SwapEstimator => {
  return (e: MarketEdge, usdIn: BigNumber) => {
    const marketInfo = marketsInfoData[e.marketAddress];

    const swapStats = getSwapStats(marketInfo, e.from, e.to, usdIn);

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
  marketsInfoData: MarketsInfoData,
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
    const marketInfo = marketsInfoData[marketAddress];

    if (i < swapPath.length - 1) {
      _tokenOutAddress = getOppositeCollateral(marketInfo, convertTokenAddress(chainId, _tokenInAddress, "wrapped"))
        ?.address!;
    } else {
      _tokenOutAddress = tokenOutAddress;
    }

    const swapStep = getSwapStats(marketInfo, _tokenInAddress, _tokenOutAddress, usdOut, opts);

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
  marketInfo: MarketInfo,
  tokenInAddress: string,
  tokenOutAddress: string,
  usdIn: BigNumber,
  opts: {
    disablePriceImpact?: boolean;
  } = {}
): SwapStats | undefined {
  const { disablePriceImpact = false } = opts;

  const isWrap = tokenInAddress === NATIVE_TOKEN_ADDRESS;
  const isUnwrap = tokenOutAddress === NATIVE_TOKEN_ADDRESS;

  const tokenIn = getMarketCollateralByAddress(marketInfo, tokenInAddress);
  const tokenOut = getMarketCollateralByAddress(marketInfo, tokenOutAddress);

  const priceIn = tokenIn?.prices?.minPrice;
  const priceOut = tokenOut?.prices?.maxPrice;

  if (!priceIn || !priceOut) return undefined;

  const amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, priceIn)!;

  const swapFeeAmount = applyFactor(amountIn, marketInfo.swapFeeFactor);
  const swapFeeUsd = convertToUsd(swapFeeAmount, tokenIn.decimals, priceIn)!;

  const amountInAfterFees = amountIn.sub(swapFeeAmount);
  const usdInAfterFees = usdIn.sub(swapFeeUsd);

  let usdOut = usdInAfterFees;
  let amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, priceOut)!;

  const priceImpactDeltaUsd = getPriceImpactForSwap(marketInfo, tokenIn.address, amountInAfterFees, amountOut.mul(-1));

  if (!priceImpactDeltaUsd) return undefined;

  let cappedImpactDeltaUsd: BigNumber;

  if (priceImpactDeltaUsd.gt(0)) {
    const positiveImpactAmount = applySwapImpactWithCap(marketInfo, tokenOut.address, priceImpactDeltaUsd);

    if (!positiveImpactAmount) return undefined;

    cappedImpactDeltaUsd = convertToUsd(positiveImpactAmount, tokenOut.decimals, priceOut)!;
  } else {
    const negativeImpactAmount = applySwapImpactWithCap(marketInfo, tokenIn.address, priceImpactDeltaUsd);

    if (!negativeImpactAmount) return undefined;

    cappedImpactDeltaUsd = convertToUsd(negativeImpactAmount, tokenIn.decimals, priceIn)!;
  }

  if (!disablePriceImpact) {
    usdOut = usdOut.add(cappedImpactDeltaUsd);
  }

  amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, priceOut)!;

  const liquidity = getAvailableUsdLiquidityForCollateral(
    marketInfo,
    getTokenPoolType(marketInfo, tokenOutAddress) === "long"
  );

  const isOutLiquidity = !liquidity || liquidity.lt(usdOut);

  const totalFeeDeltaUsd = swapFeeUsd.mul(-1).add(cappedImpactDeltaUsd);

  return {
    swapFeeUsd,
    swapFeeAmount,
    totalFeeDeltaUsd,
    isWrap,
    isUnwrap,
    marketAddress: marketInfo.marketTokenAddress,
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
