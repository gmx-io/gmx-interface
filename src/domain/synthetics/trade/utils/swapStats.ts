import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import {
  MarketInfo,
  MarketsInfoData,
  getAvailableUsdLiquidityForCollateral,
  getOppositeCollateral,
  getTokenPoolType,
} from "domain/synthetics/markets";
import { convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { applyFactor } from "lib/numbers";
import { applySwapImpactWithCap, getPriceImpactForSwap } from "../../fees/utils/priceImpact";
import { SwapPathStats, SwapStats } from "../types";

export function getSwapPathOutputAddresses(p: {
  marketsInfoData: MarketsInfoData;
  initialCollateralAddress: string;
  swapPath: string[];
  wrappedNativeTokenAddress: string;
  shouldUnwrapNativeToken: boolean;
}) {
  const { marketsInfoData, initialCollateralAddress, swapPath, wrappedNativeTokenAddress, shouldUnwrapNativeToken } = p;

  if (swapPath.length === 0) {
    return {
      outTokenAddress:
        shouldUnwrapNativeToken && initialCollateralAddress === wrappedNativeTokenAddress
          ? NATIVE_TOKEN_ADDRESS
          : initialCollateralAddress,

      outMarketAddress: undefined,
    };
  }

  const [firstMarketAddress, ...marketAddresses] = swapPath;

  let outMarket = marketsInfoData[firstMarketAddress];
  let outTokenType = getTokenPoolType(outMarket, initialCollateralAddress);
  let outToken = outTokenType === "long" ? outMarket.shortToken : outMarket.longToken;

  for (const marketAddress of marketAddresses) {
    outMarket = marketsInfoData[marketAddress];
    outTokenType = outMarket.longTokenAddress === outToken.address ? "short" : "long";
    outToken = outTokenType === "long" ? outMarket.longToken : outMarket.shortToken;
  }

  const outTokenAddress =
    shouldUnwrapNativeToken && outToken.address === wrappedNativeTokenAddress ? NATIVE_TOKEN_ADDRESS : outToken.address;

  return {
    outTokenAddress,
    outMarketAddress: outMarket.marketTokenAddress,
  };
}

export function getSwapPathStats(p: {
  marketsInfoData: MarketsInfoData;
  swapPath: string[];
  initialCollateralAddress: string;
  wrappedNativeTokenAddress: string;
  usdIn: BigNumber;
  shouldUnwrapNativeToken: boolean;
  shouldApplyPriceImpact: boolean;
}): SwapPathStats | undefined {
  const {
    marketsInfoData,
    swapPath,
    initialCollateralAddress,
    usdIn,
    shouldUnwrapNativeToken,
    shouldApplyPriceImpact,
    wrappedNativeTokenAddress,
  } = p;

  if (swapPath.length === 0) {
    return undefined;
  }

  const swapSteps: SwapStats[] = [];

  let usdOut = usdIn;

  let tokenInAddress = initialCollateralAddress;
  let tokenOutAddress = initialCollateralAddress;

  let totalSwapPriceImpactDeltaUsd = BigNumber.from(0);
  let totalSwapFeeUsd = BigNumber.from(0);

  for (let i = 0; i < swapPath.length; i++) {
    const marketAddress = swapPath[i];
    const marketInfo = marketsInfoData[marketAddress];

    tokenOutAddress = getOppositeCollateral(marketInfo, tokenInAddress)!.address;

    if (i === swapPath.length - 1 && shouldUnwrapNativeToken && tokenOutAddress === wrappedNativeTokenAddress) {
      tokenOutAddress = NATIVE_TOKEN_ADDRESS;
    }

    try {
      const swapStep = getSwapStats({
        marketInfo,
        tokenInAddress,
        tokenOutAddress,
        usdIn: usdOut,
        shouldApplyPriceImpact,
      });

      tokenInAddress = swapStep.tokenOutAddress;
      usdOut = swapStep.usdOut;

      totalSwapPriceImpactDeltaUsd = totalSwapPriceImpactDeltaUsd.add(swapStep.priceImpactDeltaUsd);
      totalSwapFeeUsd = totalSwapFeeUsd.add(swapStep.swapFeeUsd);

      swapSteps.push(swapStep);
    } catch (e) {
      return undefined;
    }
  }

  const lastStep = swapSteps[swapSteps.length - 1];
  const targetMarketAddress = lastStep.marketAddress;
  const amountOut = lastStep.amountOut;

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

export function getSwapStats(p: {
  marketInfo: MarketInfo;
  tokenInAddress: string;
  tokenOutAddress: string;
  usdIn: BigNumber;
  shouldApplyPriceImpact: boolean;
}): SwapStats {
  const { marketInfo, tokenInAddress, tokenOutAddress, usdIn, shouldApplyPriceImpact } = p;

  const isWrap = tokenInAddress === NATIVE_TOKEN_ADDRESS;
  const isUnwrap = tokenOutAddress === NATIVE_TOKEN_ADDRESS;

  const tokenIn =
    getTokenPoolType(marketInfo, tokenInAddress) === "long" ? marketInfo.longToken : marketInfo.shortToken;

  const tokenOut =
    getTokenPoolType(marketInfo, tokenOutAddress) === "long" ? marketInfo.longToken : marketInfo.shortToken;

  const priceIn = tokenIn.prices.minPrice;
  const priceOut = tokenOut.prices.maxPrice;

  const amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, priceIn)!;

  const swapFeeAmount = applyFactor(amountIn, marketInfo.swapFeeFactor);
  const swapFeeUsd = applyFactor(usdIn, marketInfo.swapFeeFactor);

  const amountInAfterFees = amountIn.sub(swapFeeAmount);
  const usdInAfterFees = usdIn.sub(swapFeeUsd);

  let usdOut = usdInAfterFees;
  let amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, priceOut)!;

  const priceImpactDeltaUsd = getPriceImpactForSwap(marketInfo, tokenIn.address, amountInAfterFees, amountOut.mul(-1));

  let cappedImpactDeltaUsd: BigNumber;

  if (priceImpactDeltaUsd.gt(0)) {
    const positiveImpactAmount = applySwapImpactWithCap(marketInfo, tokenOut.address, priceImpactDeltaUsd);
    cappedImpactDeltaUsd = convertToUsd(positiveImpactAmount, tokenOut.decimals, priceOut)!;
  } else {
    const negativeImpactAmount = applySwapImpactWithCap(marketInfo, tokenIn.address, priceImpactDeltaUsd);
    cappedImpactDeltaUsd = convertToUsd(negativeImpactAmount, tokenIn.decimals, priceIn)!;
  }

  if (shouldApplyPriceImpact) {
    usdOut = usdOut.add(cappedImpactDeltaUsd);
  }

  amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, priceOut)!;

  const liquidity = getAvailableUsdLiquidityForCollateral(
    marketInfo,
    getTokenPoolType(marketInfo, tokenOutAddress) === "long"
  );

  const isOutLiquidity = liquidity.lt(usdOut);

  return {
    swapFeeUsd,
    swapFeeAmount,
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
