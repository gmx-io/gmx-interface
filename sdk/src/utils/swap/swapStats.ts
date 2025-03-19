import { NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { MarketInfo, MarketsInfoData } from "types/markets";
import { getByKey } from "../objects";
import { getAvailableUsdLiquidityForCollateral, getOppositeCollateral, getTokenPoolType } from "../markets";
import { SwapPathStats, SwapStats } from "types/trade";
import { convertToTokenAmount, convertToUsd, getMidPrice } from "../tokens";
import { applySwapImpactWithCap, getPriceImpactForSwap, getSwapFee } from "../fees";
import { maxUint256 } from "viem";

export function getSwapCapacityUsd(marketInfo: MarketInfo, isLong: boolean) {
  const poolAmount = isLong ? marketInfo.longPoolAmount : marketInfo.shortPoolAmount;
  const maxPoolAmount = isLong ? marketInfo.maxLongPoolAmount : marketInfo.maxShortPoolAmount;

  const capacityAmount = maxPoolAmount - poolAmount;
  const token = isLong ? marketInfo.longToken : marketInfo.shortToken;

  const capacityUsd = convertToUsd(capacityAmount, token.decimals, getMidPrice(token.prices))!;

  return capacityUsd;
}

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
    // Increase
    if (isIncrease) {
      // During increase target collateral token is always ERC20 token, it can not be native token.
      // Thus we do not need to check if initial collateral token is wrapped token to unwrap it.
      // So we can safely return initial collateral token address as out token address, when there is no swap path.

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

export function getSwapPathStats(p: {
  marketsInfoData: MarketsInfoData;
  swapPath: string[];
  initialCollateralAddress: string;
  wrappedNativeTokenAddress: string;
  usdIn: bigint;
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

  let totalSwapPriceImpactDeltaUsd = 0n;
  let totalSwapFeeUsd = 0n;

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

    totalSwapPriceImpactDeltaUsd = totalSwapPriceImpactDeltaUsd + swapStep.priceImpactDeltaUsd;
    totalSwapFeeUsd = totalSwapFeeUsd + swapStep.swapFeeUsd;

    swapSteps.push(swapStep);
  }

  const lastStep = swapSteps[swapSteps.length - 1];
  const targetMarketAddress = lastStep.marketAddress;
  const amountOut = lastStep.amountOut;

  const totalFeesDeltaUsd = 0n - totalSwapFeeUsd + totalSwapPriceImpactDeltaUsd;

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
  usdIn: bigint;
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

  let priceImpactDeltaUsd: bigint;

  try {
    priceImpactDeltaUsd = getPriceImpactForSwap(marketInfo, tokenIn, tokenOut, usdIn, usdIn * -1n);
  } catch (e) {
    return {
      swapFeeUsd: 0n,
      swapFeeAmount: 0n,
      isWrap,
      isUnwrap,
      marketAddress: marketInfo.marketTokenAddress,
      tokenInAddress,
      tokenOutAddress,
      priceImpactDeltaUsd: 0n,
      amountIn,
      amountInAfterFees: amountIn,
      usdIn,
      amountOut: 0n,
      usdOut: 0n,
      isOutLiquidity: true,
    };
  }

  const swapFeeAmount = getSwapFee(marketInfo, amountIn, priceImpactDeltaUsd > 0);
  const swapFeeUsd = getSwapFee(marketInfo, usdIn, priceImpactDeltaUsd > 0);

  const amountInAfterFees = amountIn - swapFeeAmount;
  const usdInAfterFees = usdIn - swapFeeUsd;

  let usdOut = usdInAfterFees;
  let amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, priceOut)!;

  let cappedImpactDeltaUsd: bigint;

  if (priceImpactDeltaUsd > 0) {
    const { impactDeltaAmount: positiveImpactAmountTokenOut, cappedDiffUsd } = applySwapImpactWithCap(
      marketInfo,
      tokenOut,
      priceImpactDeltaUsd
    );
    cappedImpactDeltaUsd = convertToUsd(positiveImpactAmountTokenOut, tokenOut.decimals, priceOut)!;

    // https://github.com/gmx-io/gmx-synthetics/blob/3df10f1eab2734cf1b5f0a5dff12b79cbb19907d/contracts/swap/SwapUtils.sol#L290-L291
    if (cappedDiffUsd > 0) {
      const { impactDeltaAmount: positiveImpactAmountTokenIn } = applySwapImpactWithCap(
        marketInfo,
        tokenIn,
        cappedDiffUsd
      );
      if (positiveImpactAmountTokenIn > 0) {
        cappedImpactDeltaUsd += convertToUsd(positiveImpactAmountTokenIn, tokenIn.decimals, priceIn)!;
      }
    }
  } else {
    const { impactDeltaAmount: negativeImpactAmount } = applySwapImpactWithCap(
      marketInfo,
      tokenIn,
      priceImpactDeltaUsd
    );
    cappedImpactDeltaUsd = convertToUsd(negativeImpactAmount, tokenIn.decimals, priceIn)!;
  }

  if (shouldApplyPriceImpact) {
    usdOut = usdOut + cappedImpactDeltaUsd;
  }

  if (usdOut < 0) {
    usdOut = 0n;
  }

  amountOut = convertToTokenAmount(usdOut, tokenOut.decimals, priceOut)!;

  const capacityUsd = getSwapCapacityUsd(marketInfo, getTokenPoolType(marketInfo, tokenInAddress) === "long");

  const isOutCapacity = capacityUsd < usdInAfterFees;

  const liquidity = getAvailableUsdLiquidityForCollateral(
    marketInfo,
    getTokenPoolType(marketInfo, tokenOutAddress) === "long"
  );

  const isOutLiquidity = liquidity < usdOut;

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
    isOutCapacity,
  };
}

export function getMaxSwapPathLiquidity(p: {
  marketsInfoData: MarketsInfoData;
  swapPath: string[];
  initialCollateralAddress: string;
}) {
  const { marketsInfoData, swapPath, initialCollateralAddress } = p;

  if (swapPath.length === 0) {
    return 0n;
  }

  let minMarketLiquidity = maxUint256;
  let tokenInAddress = initialCollateralAddress;

  for (const marketAddress of swapPath) {
    const marketInfo = getByKey(marketsInfoData, marketAddress);

    if (!marketInfo) {
      return 0n;
    }

    const tokenOut = getOppositeCollateral(marketInfo, tokenInAddress);

    if (!tokenOut) {
      return 0n;
    }

    const isTokenOutLong = getTokenPoolType(marketInfo, tokenOut.address) === "long";
    const liquidity = getAvailableUsdLiquidityForCollateral(marketInfo, isTokenOutLong);

    if (liquidity < minMarketLiquidity) {
      minMarketLiquidity = liquidity;
    }

    tokenInAddress = tokenOut.address;
  }

  if (minMarketLiquidity === maxUint256) {
    return 0n;
  }

  return minMarketLiquidity;
}
