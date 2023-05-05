import { UserReferralInfo } from "domain/referrals";
import {
  VirtualInventoryForPositionsData,
  getCappedPositionImpactUsd,
  getPositionFee,
  getPriceImpactForPosition,
} from "domain/synthetics/fees";
import { MarketInfo } from "domain/synthetics/markets";
import { PositionInfo, getLeverage, getLiquidationPrice } from "domain/synthetics/positions";
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
  virtualInventoryForPositions: VirtualInventoryForPositionsData;
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
    virtualInventoryForPositions,
  } = p;
  const { indexToken } = marketInfo;

  const markPrice = getMarkPrice({ prices: indexToken.prices, isIncrease: true, isLong })!;
  const entryPrice = isLimit && triggerPrice ? triggerPrice : markPrice;

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

  positionPriceImpactDeltaUsd =
    getCappedPositionImpactUsd(marketInfo, virtualInventoryForPositions, sizeDeltaUsd, p.isLong) || BigNumber.from(0);

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
  acceptablePriceImpactBps = acceptablePriceInfo?.acceptablePriceImpactBps;

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
  virtualInventoryForPositions: VirtualInventoryForPositionsData;
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
    virtualInventoryForPositions,
  } = p;
  const { indexToken } = marketInfo;

  const markPrice = getMarkPrice({ prices: indexToken.prices, isIncrease: true, isLong })!;
  const entryPrice = isLimit && triggerPrice ? triggerPrice : markPrice;

  const initialCollateralPrice = initialCollateralToken.prices.minPrice;
  const collateralPrice = collateralToken.prices.maxPrice;

  const sizeDeltaUsd = convertToUsd(sizeDeltaInTokens, indexToken.decimals, entryPrice)!;

  const positionFee = getPositionFee(marketInfo, sizeDeltaUsd, userReferralInfo);
  const positionFeeUsd = positionFee.positionFeeUsd;
  const feeDiscountUsd = positionFee.discountUsd;

  const positionPriceImpactDeltaUsd = getPriceImpactForPosition(
    marketInfo,
    virtualInventoryForPositions,
    sizeDeltaUsd,
    isLong
  );

  const { acceptablePrice, acceptablePriceImpactBps } = getAcceptablePrice({
    isIncrease: true,
    isLong,
    indexPrice: entryPrice,
    sizeDeltaUsd: sizeDeltaUsd,
    priceImpactDeltaUsd: !isLimit ? positionPriceImpactDeltaUsd : undefined,
    // TODO separate to 2 functions?
    acceptablePriceImpactBps: isLimit ? savedAcceptablePriceImpactBps : undefined,
  });

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
  sizeDeltaUsd: BigNumber;
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
    sizeDeltaUsd,
    collateralDeltaUsd,
    entryPrice,
    isLong,
    showPnlInLeverage,
    minCollateralUsd,
    userReferralInfo,
  } = p;

  const nextSizeUsd = existingPosition ? existingPosition.sizeInUsd.add(sizeDeltaUsd) : sizeDeltaUsd;

  // TODO: initialCollateralInstread?
  const nextCollateralUsd = existingPosition
    ? existingPosition.remainingCollateralUsd.add(collateralDeltaUsd)
    : collateralDeltaUsd;

  const nextLeverage = getLeverage({
    sizeInUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    pnl: showPnlInLeverage ? existingPosition?.pnl : undefined,
    pendingBorrowingFeesUsd: BigNumber.from(0), // deducted on order
    pendingFundingFeesUsd: BigNumber.from(0), // deducted on order
  });

  const nextLiqPrice = getLiquidationPrice({
    sizeInUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    markPrice: entryPrice,
    minCollateralFactor: marketInfo.minCollateralFactor,
    minCollateralUsd,
    closingFeeUsd: getPositionFee(marketInfo, sizeDeltaUsd, userReferralInfo).positionFeeUsd,
    maxPriceImpactFactor: marketInfo?.maxPositionImpactFactorForLiquidations,
    pendingBorrowingFeesUsd: BigNumber.from(0), // deducted on order
    pendingFundingFeesUsd: BigNumber.from(0), // deducted on order
    pnl: existingPosition?.pnl || BigNumber.from(0),
    isLong: isLong,
  });

  return {
    nextSizeUsd,
    nextCollateralUsd,
    nextLeverage,
    nextLiqPrice,
    nextEntryPrice: entryPrice,
  };
}
