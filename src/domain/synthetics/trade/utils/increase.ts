import { UserReferralInfo } from "domain/referrals";
import { getCappedPositionImpactUsd, getPositionFee, getPriceImpactForPosition } from "domain/synthetics/fees";
import { MarketInfo } from "domain/synthetics/markets";
import {
  PositionInfo,
  getEntryPrice,
  getLeverage,
  getLiquidationPrice,
  getPositionPendingFeesUsd,
} from "domain/synthetics/positions";
import { TokenData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { getIsEquivalentTokens } from "domain/tokens";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { FindSwapPath, IncreasePositionAmounts, NextPositionValues, SwapAmounts } from "../types";
import { getAcceptablePrice, getMarkPrice } from "./prices";
import { getSwapAmountsByFromValue, getSwapAmountsByToValue } from "./swap";

export function getIncreasePositionAmountsByCollateral(p: {
  marketInfo: MarketInfo;
  initialCollateralToken: TokenData;
  collateralToken: TokenData;
  isLong: boolean;
  initialCollateralAmount: BigNumber;
  leverage?: BigNumber;
  isLimit?: boolean;
  triggerPrice?: BigNumber;
  savedAcceptablePriceImpactBps?: BigNumber;
  userReferralInfo: UserReferralInfo | undefined;
  findSwapPath: FindSwapPath;
}): IncreasePositionAmounts {
  const {
    marketInfo,
    initialCollateralToken,
    collateralToken,
    initialCollateralAmount,
    isLong,
    leverage,
    triggerPrice,
    isLimit,
    savedAcceptablePriceImpactBps,
    findSwapPath,
    userReferralInfo,
  } = p;
  const { indexToken } = marketInfo;

  const markPrice = getMarkPrice({ prices: indexToken.prices, isIncrease: true, isLong })!;
  const entryPrice = isLimit && triggerPrice?.gt(0) ? triggerPrice : markPrice;

  const initialCollateralPrice = initialCollateralToken.prices.minPrice;
  const collateralPrice = collateralToken.prices.maxPrice;

  const initialCollateralUsd = convertToUsd(
    initialCollateralAmount,
    initialCollateralToken.decimals,
    initialCollateralPrice
  )!;

  let collateralUsdAfterFees = BigNumber.from(0);
  let collateralAmountAfterFees = BigNumber.from(0);

  let sizeDeltaUsd = BigNumber.from(0);
  let sizeDeltaInTokens = BigNumber.from(0);

  let positionFeeUsd = BigNumber.from(0);
  let feeDiscountUsd = BigNumber.from(0);
  let positionPriceImpactDeltaUsd = BigNumber.from(0);

  let acceptablePrice: BigNumber | undefined = undefined;
  let acceptablePriceImpactBps: BigNumber | undefined = undefined;

  let swapAmounts: SwapAmounts | undefined = undefined;

  const defaultAmounts: IncreasePositionAmounts = {
    initialCollateralAmount,
    initialCollateralUsd,
    collateralUsdAfterFees,
    collateralAmountAfterFees,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    positionFeeUsd,
    feeDiscountUsd,
    positionPriceImpactDeltaUsd,
    swapPathStats: undefined,
    entryPrice,
    markPrice,
    triggerPrice,
    initialCollateralPrice,
    collateralPrice,
    acceptablePrice,
    acceptablePriceImpactBps,
  };

  if (initialCollateralAmount.lte(0)) {
    return defaultAmounts;
  }

  if (getIsEquivalentTokens(initialCollateralToken, collateralToken)) {
    collateralAmountAfterFees = initialCollateralAmount;
    collateralUsdAfterFees = initialCollateralUsd;
  } else {
    swapAmounts = getSwapAmountsByFromValue({
      tokenIn: initialCollateralToken,
      tokenOut: collateralToken,
      amountIn: initialCollateralAmount,
      isLimit: false,
      findSwapPath,
    });

    if (!swapAmounts) {
      return defaultAmounts;
    }

    collateralAmountAfterFees = swapAmounts.amountOut;
    collateralUsdAfterFees = swapAmounts.usdOut;
  }

  const baseSizeDeltaUsd = collateralUsdAfterFees.mul(leverage || BASIS_POINTS_DIVISOR).div(BASIS_POINTS_DIVISOR);
  const basePositionFeeInfo = getPositionFee(marketInfo, baseSizeDeltaUsd, userReferralInfo);

  collateralUsdAfterFees = collateralUsdAfterFees.sub(basePositionFeeInfo.positionFeeUsd);
  sizeDeltaUsd = collateralUsdAfterFees.mul(leverage || BASIS_POINTS_DIVISOR).div(BASIS_POINTS_DIVISOR);

  const positionFeeInfo = getPositionFee(marketInfo, sizeDeltaUsd, userReferralInfo);
  positionFeeUsd = positionFeeInfo.positionFeeUsd;
  feeDiscountUsd = positionFeeInfo.discountUsd;

  positionPriceImpactDeltaUsd = getCappedPositionImpactUsd(marketInfo, sizeDeltaUsd, p.isLong) || BigNumber.from(0);

  const acceptablePriceInfo = getAcceptablePrice({
    isIncrease: true,
    isLong,
    indexPrice: entryPrice,
    sizeDeltaUsd,
    priceImpactDeltaUsd: !isLimit ? positionPriceImpactDeltaUsd : undefined,
    // TODO separate to 2 functions?
    acceptablePriceImpactBps: isLimit ? savedAcceptablePriceImpactBps : undefined,
  });

  acceptablePrice = acceptablePriceInfo?.acceptablePrice;
  acceptablePriceImpactBps = acceptablePriceInfo?.priceDiffBps;

  sizeDeltaInTokens = convertToTokenAmount(sizeDeltaUsd, indexToken.decimals, entryPrice)!;

  return {
    initialCollateralAmount,
    initialCollateralUsd,
    collateralUsdAfterFees,
    collateralAmountAfterFees,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    positionFeeUsd,
    feeDiscountUsd,
    positionPriceImpactDeltaUsd,
    swapPathStats: swapAmounts?.swapPathStats,
    entryPrice,
    markPrice,
    triggerPrice,
    initialCollateralPrice,
    collateralPrice,
    acceptablePrice,
    acceptablePriceImpactBps,
  };
}

export function getIncreasePositionAmountsBySizeDelta(p: {
  marketInfo: MarketInfo;
  initialCollateralToken: TokenData;
  collateralToken: TokenData;
  isLong: boolean;
  sizeDeltaInTokens: BigNumber;
  leverage?: BigNumber;
  isLimit?: boolean;
  triggerPrice?: BigNumber;
  savedAcceptablePriceImpactBps?: BigNumber;
  userReferralInfo: UserReferralInfo | undefined;
  findSwapPath: FindSwapPath;
}): IncreasePositionAmounts {
  const {
    marketInfo,
    initialCollateralToken,
    collateralToken,
    sizeDeltaInTokens,
    isLong,
    leverage,
    triggerPrice,
    isLimit,
    savedAcceptablePriceImpactBps,
    userReferralInfo,
    findSwapPath,
  } = p;
  const { indexToken } = marketInfo;

  const markPrice = getMarkPrice({ prices: indexToken.prices, isIncrease: true, isLong })!;
  const entryPrice = isLimit && triggerPrice?.gt(0) ? triggerPrice : markPrice;

  const initialCollateralPrice = initialCollateralToken.prices.minPrice;
  const collateralPrice = collateralToken.prices.maxPrice;

  let sizeDeltaUsd = convertToUsd(sizeDeltaInTokens, indexToken.decimals, entryPrice)!;

  const positionFee = getPositionFee(marketInfo, sizeDeltaUsd, userReferralInfo);
  const positionFeeUsd = positionFee.positionFeeUsd;
  const feeDiscountUsd = positionFee.discountUsd;

  const positionPriceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, sizeDeltaUsd, isLong);

  const { acceptablePrice, priceDiffBps: acceptablePriceImpactBps } = getAcceptablePrice({
    isIncrease: true,
    isLong,
    indexPrice: entryPrice,
    sizeDeltaUsd: sizeDeltaUsd,
    priceImpactDeltaUsd: !isLimit ? positionPriceImpactDeltaUsd : undefined,
    // TODO separate to 2 functions?
    acceptablePriceImpactBps: isLimit ? savedAcceptablePriceImpactBps : undefined,
  });

  sizeDeltaUsd = convertToUsd(sizeDeltaInTokens, indexToken.decimals, acceptablePrice)!;

  let initialCollateralAmount = BigNumber.from(0);
  let initialCollateralUsd = BigNumber.from(0);

  let collateralUsdAfterFees = BigNumber.from(0);
  let collateralAmountAfterFees = BigNumber.from(0);

  let swapAmounts: SwapAmounts | undefined = undefined;

  const defaultAmounts: IncreasePositionAmounts = {
    initialCollateralAmount,
    initialCollateralUsd,
    collateralUsdAfterFees,
    collateralAmountAfterFees,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    positionFeeUsd,
    feeDiscountUsd,
    positionPriceImpactDeltaUsd,
    swapPathStats: undefined,
    markPrice,
    entryPrice,
    triggerPrice,
    initialCollateralPrice,
    collateralPrice,
    acceptablePrice,
    acceptablePriceImpactBps,
  };

  if (sizeDeltaInTokens.lte(0)) {
    return defaultAmounts;
  }

  collateralUsdAfterFees = sizeDeltaUsd;

  if (leverage) {
    collateralUsdAfterFees = collateralUsdAfterFees.mul(BASIS_POINTS_DIVISOR).div(leverage);
  }

  collateralAmountAfterFees = convertToTokenAmount(collateralUsdAfterFees, collateralToken.decimals, collateralPrice)!;

  const collateralUsd = collateralUsdAfterFees.add(positionFeeUsd);
  const collateralAmount = convertToTokenAmount(collateralUsd, collateralToken.decimals, collateralPrice)!;

  if (getIsEquivalentTokens(initialCollateralToken, collateralToken)) {
    initialCollateralAmount = collateralAmount;
    initialCollateralUsd = collateralUsd;
  } else {
    swapAmounts = getSwapAmountsByToValue({
      tokenIn: initialCollateralToken,
      tokenOut: collateralToken,
      amountOut: collateralAmount,
      findSwapPath,
      isLimit: false,
    });

    initialCollateralAmount = swapAmounts.amountIn;
    initialCollateralUsd = swapAmounts.usdIn;
  }

  return {
    initialCollateralAmount,
    initialCollateralUsd,
    collateralUsdAfterFees,
    collateralAmountAfterFees,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    positionFeeUsd,
    feeDiscountUsd,
    positionPriceImpactDeltaUsd,
    swapPathStats: swapAmounts?.swapPathStats,
    entryPrice,
    markPrice,
    triggerPrice,
    initialCollateralPrice,
    collateralPrice,
    acceptablePrice,
    acceptablePriceImpactBps,
  };
}

export function getNextPositionValuesForIncreaseTrade(p: {
  existingPosition?: PositionInfo;
  marketInfo: MarketInfo;
  collateralToken: TokenData;
  sizeDeltaUsd: BigNumber;
  sizeDeltaInTokens: BigNumber;
  collateralDeltaUsd: BigNumber;
  entryPrice: BigNumber;
  isLong: boolean;
  showPnlInLeverage: boolean;
  minCollateralUsd: BigNumber;
  userReferralInfo: UserReferralInfo | undefined;
}): NextPositionValues {
  const {
    existingPosition,
    marketInfo,
    collateralToken,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    collateralDeltaUsd,
    entryPrice,
    isLong,
    showPnlInLeverage,
    minCollateralUsd,
    userReferralInfo,
  } = p;

  let nextCollateralUsd: BigNumber;
  let remainingCollateralFeesUsd = BigNumber.from(0);

  if (existingPosition) {
    const pendingFeesUsd = getPositionPendingFeesUsd(existingPosition);
    const collateralDeltaAfterFeesUsd = collateralDeltaUsd.sub(pendingFeesUsd);
    remainingCollateralFeesUsd = pendingFeesUsd.sub(collateralDeltaUsd);
    nextCollateralUsd = existingPosition.collateralUsd.add(collateralDeltaAfterFeesUsd);
  } else {
    nextCollateralUsd = collateralDeltaUsd;
  }
  const nextCollateralAmount = convertToTokenAmount(
    nextCollateralUsd,
    collateralToken.decimals,
    collateralToken.prices.minPrice
  )!;

  const nextSizeUsd = existingPosition ? existingPosition.sizeInUsd.add(sizeDeltaUsd) : sizeDeltaUsd;
  const nextSizeInTokens = existingPosition
    ? existingPosition.sizeInTokens.add(sizeDeltaInTokens || 0)
    : sizeDeltaInTokens;

  const nextEntryPrice = existingPosition?.sizeInTokens.gt(0)
    ? getEntryPrice({
        sizeInUsd: nextSizeUsd,
        sizeInTokens: nextSizeInTokens,
        indexToken: marketInfo.indexToken,
      })!
    : entryPrice;

  const nextLeverage = getLeverage({
    sizeInUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    pnl: showPnlInLeverage ? existingPosition?.pnl : undefined,
    pendingBorrowingFeesUsd: BigNumber.from(0), // deducted on order
    pendingFundingFeesUsd: BigNumber.from(0), // deducted on order
  });

  const nextLiqPrice = getLiquidationPrice({
    marketInfo,
    collateralToken,
    sizeInUsd: nextSizeUsd,
    sizeInTokens: nextSizeInTokens,
    collateralUsd: nextCollateralUsd,
    collateralAmount: nextCollateralAmount,
    markPrice: nextEntryPrice,
    minCollateralUsd,
    closingFeeUsd: getPositionFee(marketInfo, nextSizeUsd, userReferralInfo).positionFeeUsd,
    pendingBorrowingFeesUsd: BigNumber.from(0), // deducted on order
    pendingFundingFeesUsd: BigNumber.from(0), // deducted on order
    isLong: isLong,
  });

  return {
    nextSizeUsd,
    nextCollateralUsd,
    nextLeverage,
    nextLiqPrice,
    nextEntryPrice,
    remainingCollateralFeesUsd,
  };
}
