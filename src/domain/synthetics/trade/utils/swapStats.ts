import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { getSwapFee } from "domain/synthetics/fees";
import {
  MarketInfo,
  MarketsInfoData,
  getAvailableUsdLiquidityForCollateral,
  getOppositeCollateral,
  getTokenPoolType,
} from "domain/synthetics/markets";
import { convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import { getByKey } from "lib/objects";
import { applySwapImpactWithCap, getPriceImpactForSwap } from "../../fees/utils/priceImpact";
import { SwapPathStats, SwapStats } from "../types";

export function getSwapPathOutputAddresses(p: {
  marketsInfoData: MarketsInfoData;
  initialCollateralAddress: string;
  swapPath: string[];
  wrappedNativeTokenAddress: string;
  shouldUnwrapNativeToken: boolean;
  isIncrease: boolean;
}) {
  const {
    marketsInfoData,
    initialCollateralAddress,
    swapPath,
    wrappedNativeTokenAddress,
    shouldUnwrapNativeToken,
    isIncrease,
  } = p;

  if (swapPath.length === 0) {
    // If the swap path is empty and is increase order,
    // we do not care about the output token address during happy path,
    // as user will not be getting any token in return.
    // By this point shouldUnwrapNativeToken is already saved in the contract in case of cancelation or errors.

    // Increase
    if (isIncrease) {
      return {
        outTokenAddress: initialCollateralAddress,
        outMarketAddress: undefined,
      };
    }

    // Decrease
    if (shouldUnwrapNativeToken && initialCollateralAddress === wrappedNativeTokenAddress) {
      return {
        outTokenAddress: NATIVE_TOKEN_ADDRESS,
        outMarketAddress: undefined,
      };
    }

    return {
      outTokenAddress: initialCollateralAddress,
      outMarketAddress: undefined,
    };
  }

  const [firstMarketAddress, ...marketAddresses] = swapPath;

  let outMarket = getByKey(marketsInfoData, firstMarketAddress);

  if (!outMarket) {
    return {
      outTokenAddress: undefined,
      outMarketAddress: undefined,
    };
  }

  let outTokenType = getTokenPoolType(outMarket, initialCollateralAddress);
  let outToken = outTokenType === "long" ? outMarket.shortToken : outMarket.longToken;

  for (const marketAddress of marketAddresses) {
    outMarket = getByKey(marketsInfoData, marketAddress);

    if (!outMarket) {
      return {
        outTokenAddress: undefined,
        outMarketAddress: undefined,
      };
    }

    outTokenType = outMarket.longTokenAddress === outToken.address ? "short" : "long";
    outToken = outTokenType === "long" ? outMarket.longToken : outMarket.shortToken;
  }

  let outTokenAddress: string;
  if (isIncrease) {
    // Here swap path is not empty, this means out token came from swapping tokens,
    // thus it can not be native token by design.
    outTokenAddress = outToken.address;
  } else {
    if (shouldUnwrapNativeToken && outToken.address === wrappedNativeTokenAddress) {
      outTokenAddress = NATIVE_TOKEN_ADDRESS;
    } else {
      outTokenAddress = outToken.address;
    }
  }

  return {
    outTokenAddress,
    outMarketAddress: outMarket.marketTokenAddress,
  };
}

export function getMaxSwapPathLiquidity(p: {
  marketsInfoData: MarketsInfoData;
  swapPath: string[];
  initialCollateralAddress: string;
}) {
  const { marketsInfoData, swapPath, initialCollateralAddress } = p;

  if (swapPath.length === 0) {
    return BigNumber.from(0);
  }

  let minMarketLiquidity = ethers.constants.MaxUint256;
  let tokenInAddress = initialCollateralAddress;

  for (const marketAddress of swapPath) {
    const marketInfo = getByKey(marketsInfoData, marketAddress);

    if (!marketInfo) {
      return BigNumber.from(0);
    }

    const tokenOut = getOppositeCollateral(marketInfo, tokenInAddress);

    if (!tokenOut) {
      return BigNumber.from(0);
    }

    const isTokenOutLong = getTokenPoolType(marketInfo, tokenOut.address) === "long";
    const liquidity = getAvailableUsdLiquidityForCollateral(marketInfo, isTokenOutLong);

    if (liquidity.lt(minMarketLiquidity)) {
      minMarketLiquidity = liquidity;
    }

    tokenInAddress = tokenOut.address;
  }

  if (minMarketLiquidity.eq(ethers.constants.MaxUint256)) {
    return BigNumber.from(0);
  }

  return minMarketLiquidity;
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

  let priceImpactDeltaUsd: BigNumber;

  try {
    priceImpactDeltaUsd = getPriceImpactForSwap(marketInfo, tokenIn, tokenOut, usdIn, usdIn.mul(-1));
  } catch (e) {
    return {
      swapFeeUsd: BigNumber.from(0),
      swapFeeAmount: BigNumber.from(0),
      isWrap,
      isUnwrap,
      marketAddress: marketInfo.marketTokenAddress,
      tokenInAddress,
      tokenOutAddress,
      priceImpactDeltaUsd: BigNumber.from(0),
      amountIn,
      amountInAfterFees: amountIn,
      usdIn,
      amountOut: BigNumber.from(0),
      usdOut: BigNumber.from(0),
      isOutLiquidity: true,
    };
  }

  const swapFeeAmount = getSwapFee(marketInfo, amountIn, priceImpactDeltaUsd.gt(0));
  const swapFeeUsd = getSwapFee(marketInfo, usdIn, priceImpactDeltaUsd.gt(0));

  const amountInAfterFees = amountIn.sub(swapFeeAmount);
  const usdInAfterFees = usdIn.sub(swapFeeUsd);

  let usdOut = usdInAfterFees;
  let amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, priceOut)!;

  let cappedImpactDeltaUsd: BigNumber;

  if (priceImpactDeltaUsd.gt(0)) {
    const positiveImpactAmount = applySwapImpactWithCap(marketInfo, tokenOut, priceImpactDeltaUsd);
    cappedImpactDeltaUsd = convertToUsd(positiveImpactAmount, tokenOut.decimals, priceOut)!;
  } else {
    const negativeImpactAmount = applySwapImpactWithCap(marketInfo, tokenIn, priceImpactDeltaUsd);
    cappedImpactDeltaUsd = convertToUsd(negativeImpactAmount, tokenIn.decimals, priceIn)!;
  }

  if (shouldApplyPriceImpact) {
    usdOut = usdOut.add(cappedImpactDeltaUsd);
  }

  if (usdOut.lt(0)) {
    usdOut = BigNumber.from(0);
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
    usdIn,
    amountOut,
    usdOut,
    isOutLiquidity,
  };
}
