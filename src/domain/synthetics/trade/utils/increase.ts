import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { UserReferralInfo } from "domain/referrals";
import { getPositionFee, getPriceImpactForPosition, getTotalSwapVolumeFromSwapStats } from "domain/synthetics/fees";
import { MarketInfo } from "domain/synthetics/markets";
import { OrderType } from "domain/synthetics/orders";
import {
  PositionInfo,
  getEntryPrice,
  getLeverage,
  getLiquidationPrice,
  getPositionPnlUsd,
} from "domain/synthetics/positions";
import { TokenData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { getIsEquivalentTokens } from "domain/tokens";
import { FindSwapPath, IncreasePositionAmounts, NextPositionValues } from "../types";
import {
  getAcceptablePriceInfo,
  getDefaultAcceptablePriceImpactBps,
  getMarkPrice,
  getTriggerThresholdType,
} from "./prices";
import { getSwapAmountsByFromValue, getSwapAmountsByToValue } from "./swap";
import { applyFactor } from "lib/numbers";
import { bigMath } from "lib/bigmath";

export function getIncreasePositionAmounts(p: {
  marketInfo: MarketInfo;
  indexToken: TokenData;
  initialCollateralToken: TokenData;
  collateralToken: TokenData;
  isLong: boolean;
  initialCollateralAmount: bigint | undefined;
  position: PositionInfo | undefined;
  indexTokenAmount: bigint | undefined;
  leverage?: bigint;
  triggerPrice?: bigint;
  fixedAcceptablePriceImpactBps?: bigint;
  acceptablePriceImpactBuffer?: number;
  userReferralInfo: UserReferralInfo | undefined;
  strategy: "leverageBySize" | "leverageByCollateral" | "independent";
  findSwapPath: FindSwapPath;
  uiFeeFactor: bigint;
}): IncreasePositionAmounts {
  const {
    marketInfo,
    indexToken,
    initialCollateralToken,
    collateralToken,
    initialCollateralAmount,
    indexTokenAmount,
    isLong,
    leverage,
    triggerPrice,
    position,
    fixedAcceptablePriceImpactBps,
    acceptablePriceImpactBuffer,
    findSwapPath,
    userReferralInfo,
    uiFeeFactor,
    strategy,
  } = p;

  const values: IncreasePositionAmounts = {
    initialCollateralAmount: 0n,
    initialCollateralUsd: 0n,

    collateralDeltaAmount: 0n,
    collateralDeltaUsd: 0n,

    swapPathStats: undefined,

    indexTokenAmount: 0n,

    sizeDeltaUsd: 0n,
    sizeDeltaInTokens: 0n,

    estimatedLeverage: 0n,

    indexPrice: 0n,
    initialCollateralPrice: 0n,
    collateralPrice: 0n,
    triggerPrice: 0n,
    acceptablePrice: 0n,
    acceptablePriceDeltaBps: 0n,

    positionFeeUsd: 0n,
    uiFeeUsd: 0n,
    swapUiFeeUsd: 0n,
    feeDiscountUsd: 0n,
    borrowingFeeUsd: 0n,
    fundingFeeUsd: 0n,
    positionPriceImpactDeltaUsd: 0n,
  };

  const isLimit = Boolean(triggerPrice !== undefined && triggerPrice > 0);

  if (isLimit && triggerPrice !== undefined) {
    values.triggerPrice = triggerPrice;
    values.triggerThresholdType = getTriggerThresholdType(OrderType.LimitIncrease, isLong);

    values.indexPrice = triggerPrice;

    values.initialCollateralPrice = getIsEquivalentTokens(indexToken, initialCollateralToken)
      ? triggerPrice
      : initialCollateralToken.prices.minPrice;

    values.collateralPrice = getIsEquivalentTokens(indexToken, collateralToken)
      ? triggerPrice
      : collateralToken.prices.minPrice;
  } else {
    values.indexPrice = getMarkPrice({ prices: indexToken.prices, isIncrease: true, isLong });
    values.initialCollateralPrice = initialCollateralToken.prices.minPrice;
    values.collateralPrice = collateralToken.prices.minPrice;
  }

  values.borrowingFeeUsd = position?.pendingBorrowingFeesUsd || 0n;
  values.fundingFeeUsd = position?.pendingFundingFeesUsd || 0n;

  if (values.indexPrice <= 0 || values.initialCollateralPrice <= 0 || values.collateralPrice <= 0) {
    return values;
  }

  // Size and collateral
  if (
    strategy === "leverageByCollateral" &&
    leverage !== undefined &&
    initialCollateralAmount !== undefined &&
    initialCollateralAmount > 0
  ) {
    values.estimatedLeverage = leverage;

    values.initialCollateralAmount = initialCollateralAmount;
    values.initialCollateralUsd = convertToUsd(
      initialCollateralAmount,
      initialCollateralToken.decimals,
      values.initialCollateralPrice
    )!;

    // TODO: collateralPrice?
    const swapAmounts = getSwapAmountsByFromValue({
      tokenIn: initialCollateralToken,
      tokenOut: collateralToken,
      amountIn: initialCollateralAmount,
      isLimit: false,
      findSwapPath,
      uiFeeFactor,
    });

    values.swapPathStats = swapAmounts.swapPathStats;

    const baseCollateralUsd = convertToUsd(swapAmounts.amountOut, collateralToken.decimals, values.collateralPrice)!;
    const baseSizeDeltaUsd = bigMath.mulDiv(baseCollateralUsd, leverage, BASIS_POINTS_DIVISOR_BIGINT);
    const basePriceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, baseSizeDeltaUsd, isLong);
    const basePositionFeeInfo = getPositionFee(
      marketInfo,
      baseSizeDeltaUsd,
      basePriceImpactDeltaUsd > 0,
      userReferralInfo
    );
    const baseUiFeeUsd = applyFactor(baseSizeDeltaUsd, uiFeeFactor);
    const totalSwapVolumeUsd = getTotalSwapVolumeFromSwapStats(values.swapPathStats?.swapSteps);
    values.swapUiFeeUsd = applyFactor(totalSwapVolumeUsd, uiFeeFactor);

    values.sizeDeltaUsd = bigMath.mulDiv(
      baseCollateralUsd - basePositionFeeInfo.positionFeeUsd - baseUiFeeUsd - values.swapUiFeeUsd,
      leverage,
      BASIS_POINTS_DIVISOR_BIGINT
    );

    values.indexTokenAmount = convertToTokenAmount(values.sizeDeltaUsd, indexToken.decimals, values.indexPrice)!;

    const positionFeeInfo = getPositionFee(
      marketInfo,
      values.sizeDeltaUsd,
      basePriceImpactDeltaUsd > 0,
      userReferralInfo
    );
    values.positionFeeUsd = positionFeeInfo.positionFeeUsd;
    values.feeDiscountUsd = positionFeeInfo.discountUsd;
    values.uiFeeUsd = applyFactor(values.sizeDeltaUsd, uiFeeFactor);

    values.collateralDeltaUsd =
      baseCollateralUsd -
      values.positionFeeUsd -
      values.borrowingFeeUsd -
      values.fundingFeeUsd -
      values.uiFeeUsd -
      values.swapUiFeeUsd;

    values.collateralDeltaAmount = convertToTokenAmount(
      values.collateralDeltaUsd,
      collateralToken.decimals,
      values.collateralPrice
    )!;
  } else if (
    strategy === "leverageBySize" &&
    leverage !== undefined &&
    indexTokenAmount !== undefined &&
    indexTokenAmount > 0
  ) {
    values.estimatedLeverage = leverage;
    values.indexTokenAmount = indexTokenAmount;
    values.sizeDeltaUsd = convertToUsd(indexTokenAmount, indexToken.decimals, values.indexPrice)!;

    const basePriceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, values.sizeDeltaUsd, isLong);

    const positionFeeInfo = getPositionFee(
      marketInfo,
      values.sizeDeltaUsd,
      basePriceImpactDeltaUsd > 0,
      userReferralInfo
    );

    values.positionFeeUsd = positionFeeInfo.positionFeeUsd;
    values.feeDiscountUsd = positionFeeInfo.discountUsd;
    values.uiFeeUsd = applyFactor(values.sizeDeltaUsd, uiFeeFactor);

    values.collateralDeltaUsd = bigMath.mulDiv(values.sizeDeltaUsd, BASIS_POINTS_DIVISOR_BIGINT, leverage);
    values.collateralDeltaAmount = convertToTokenAmount(
      values.collateralDeltaUsd,
      collateralToken.decimals,
      values.collateralPrice
    )!;

    const baseCollateralUsd =
      values.collateralDeltaUsd +
      values.positionFeeUsd +
      values.borrowingFeeUsd +
      values.fundingFeeUsd +
      values.uiFeeUsd +
      values.swapUiFeeUsd;

    const baseCollateralAmount = convertToTokenAmount(
      baseCollateralUsd,
      collateralToken.decimals,
      values.collateralPrice
    )!;

    // TODO: collateralPrice?
    const swapAmounts = getSwapAmountsByToValue({
      tokenIn: initialCollateralToken,
      tokenOut: collateralToken,
      amountOut: baseCollateralAmount,
      isLimit: false,
      findSwapPath,
      uiFeeFactor,
    });

    values.swapPathStats = swapAmounts.swapPathStats;

    values.initialCollateralAmount = swapAmounts.amountIn;
    values.initialCollateralUsd = convertToUsd(
      values.initialCollateralAmount,
      initialCollateralToken.decimals,
      values.initialCollateralPrice
    )!;
  } else if (strategy === "independent") {
    if (indexTokenAmount !== undefined && indexTokenAmount > 0) {
      values.indexTokenAmount = indexTokenAmount;
      values.sizeDeltaUsd = convertToUsd(indexTokenAmount, indexToken.decimals, values.indexPrice)!;

      const basePriceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, values.sizeDeltaUsd, isLong);

      const positionFeeInfo = getPositionFee(
        marketInfo,
        values.sizeDeltaUsd,
        basePriceImpactDeltaUsd > 0,
        userReferralInfo
      );

      values.positionFeeUsd = positionFeeInfo.positionFeeUsd;
      values.feeDiscountUsd = positionFeeInfo.discountUsd;
      values.uiFeeUsd = applyFactor(values.sizeDeltaUsd, uiFeeFactor);
    }

    if (initialCollateralAmount !== undefined && initialCollateralAmount > 0) {
      values.initialCollateralAmount = initialCollateralAmount;
      values.initialCollateralUsd = convertToUsd(
        initialCollateralAmount,
        initialCollateralToken.decimals,
        values.initialCollateralPrice
      )!;

      // TODO: collateralPrice?
      const swapAmounts = getSwapAmountsByFromValue({
        tokenIn: initialCollateralToken,
        tokenOut: collateralToken,
        amountIn: initialCollateralAmount,
        isLimit: false,
        findSwapPath,
        uiFeeFactor,
      });

      values.swapPathStats = swapAmounts.swapPathStats;
      values.swapUiFeeUsd = applyFactor(getTotalSwapVolumeFromSwapStats(values.swapPathStats?.swapSteps), uiFeeFactor);

      const baseCollateralUsd = convertToUsd(swapAmounts.amountOut, collateralToken.decimals, values.collateralPrice)!;

      values.collateralDeltaUsd =
        baseCollateralUsd -
        values.positionFeeUsd -
        values.borrowingFeeUsd -
        values.fundingFeeUsd -
        values.uiFeeUsd -
        values.swapUiFeeUsd;

      values.collateralDeltaAmount = convertToTokenAmount(
        values.collateralDeltaUsd,
        collateralToken.decimals,
        values.collateralPrice
      )!;
    }

    values.estimatedLeverage = getLeverage({
      sizeInUsd: values.sizeDeltaUsd,
      collateralUsd: values.collateralDeltaUsd,
      pnl: 0n,
      pendingBorrowingFeesUsd: 0n,
      pendingFundingFeesUsd: 0n,
    });
  }

  const acceptablePriceInfo = getAcceptablePriceInfo({
    marketInfo,
    isIncrease: true,
    isLong,
    indexPrice: values.indexPrice,
    sizeDeltaUsd: values.sizeDeltaUsd,
  });

  values.positionPriceImpactDeltaUsd = acceptablePriceInfo.priceImpactDeltaUsd;
  values.acceptablePrice = acceptablePriceInfo.acceptablePrice;
  values.acceptablePriceDeltaBps = acceptablePriceInfo.acceptablePriceDeltaBps;

  if (isLimit) {
    let maxNegativePriceImpactBps = fixedAcceptablePriceImpactBps;
    if (maxNegativePriceImpactBps === undefined) {
      maxNegativePriceImpactBps = getDefaultAcceptablePriceImpactBps({
        isIncrease: true,
        isLong,
        indexPrice: values.indexPrice,
        sizeDeltaUsd: values.sizeDeltaUsd,
        priceImpactDeltaUsd: values.positionPriceImpactDeltaUsd,
        acceptablePriceImapctBuffer: acceptablePriceImpactBuffer,
      });
    }

    const limitAcceptablePriceInfo = getAcceptablePriceInfo({
      marketInfo,
      isIncrease: true,
      isLong,
      indexPrice: values.indexPrice,
      sizeDeltaUsd: values.sizeDeltaUsd,
      maxNegativePriceImpactBps,
    });

    values.acceptablePrice = limitAcceptablePriceInfo.acceptablePrice;
    values.acceptablePriceDeltaBps = limitAcceptablePriceInfo.acceptablePriceDeltaBps;
  }

  let priceImpactAmount = 0n;

  if (values.positionPriceImpactDeltaUsd > 0) {
    const price = triggerPrice !== undefined && triggerPrice > 0 ? triggerPrice : indexToken.prices.maxPrice;
    priceImpactAmount = convertToTokenAmount(values.positionPriceImpactDeltaUsd, indexToken.decimals, price)!;
  } else {
    const price = triggerPrice !== undefined && triggerPrice > 0 ? triggerPrice : indexToken.prices.minPrice;
    priceImpactAmount = convertToTokenAmount(values.positionPriceImpactDeltaUsd, indexToken.decimals, price)!;
  }

  values.sizeDeltaInTokens = convertToTokenAmount(values.sizeDeltaUsd, indexToken.decimals, values.indexPrice)!;

  if (isLong) {
    values.sizeDeltaInTokens = values.sizeDeltaInTokens + priceImpactAmount;
  } else {
    values.sizeDeltaInTokens = values.sizeDeltaInTokens - priceImpactAmount;
  }

  return values;
}

export function getNextPositionValuesForIncreaseTrade(p: {
  existingPosition?: PositionInfo;
  marketInfo: MarketInfo;
  collateralToken: TokenData;
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  collateralDeltaUsd: bigint;
  collateralDeltaAmount: bigint;
  indexPrice: bigint;
  isLong: boolean;
  showPnlInLeverage: boolean;
  minCollateralUsd: bigint;
  userReferralInfo: UserReferralInfo | undefined;
}): NextPositionValues {
  const {
    existingPosition,
    marketInfo,
    collateralToken,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    collateralDeltaUsd,
    collateralDeltaAmount,
    indexPrice,
    isLong,
    showPnlInLeverage,
    minCollateralUsd,
    userReferralInfo,
  } = p;

  const nextCollateralUsd = existingPosition ? existingPosition.collateralUsd + collateralDeltaUsd : collateralDeltaUsd;

  const nextCollateralAmount = existingPosition
    ? existingPosition.collateralAmount + collateralDeltaAmount
    : collateralDeltaAmount;

  const nextSizeUsd = existingPosition ? existingPosition.sizeInUsd + sizeDeltaUsd : sizeDeltaUsd;
  const nextSizeInTokens = existingPosition ? existingPosition.sizeInTokens + sizeDeltaInTokens : sizeDeltaInTokens;

  const nextEntryPrice =
    getEntryPrice({
      sizeInUsd: nextSizeUsd,
      sizeInTokens: nextSizeInTokens,
      indexToken: marketInfo.indexToken,
    }) ?? indexPrice;

  const nextPnl = existingPosition
    ? getPositionPnlUsd({
        marketInfo,
        sizeInUsd: nextSizeUsd,
        sizeInTokens: nextSizeInTokens,
        markPrice: indexPrice,
        isLong,
      })
    : undefined;

  const nextLeverage = getLeverage({
    sizeInUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    pnl: showPnlInLeverage ? nextPnl : undefined,
    pendingBorrowingFeesUsd: 0n, // deducted on order
    pendingFundingFeesUsd: 0n, // deducted on order
  });

  const nextLiqPrice = getLiquidationPrice({
    marketInfo,
    collateralToken,
    sizeInUsd: nextSizeUsd,
    sizeInTokens: nextSizeInTokens,
    collateralUsd: nextCollateralUsd,
    collateralAmount: nextCollateralAmount,
    minCollateralUsd,
    pendingBorrowingFeesUsd: 0n, // deducted on order
    pendingFundingFeesUsd: 0n, // deducted on order
    isLong: isLong,
    userReferralInfo,
  });

  return {
    nextSizeUsd,
    nextCollateralUsd,
    nextEntryPrice,
    nextLeverage,
    nextLiqPrice,
  };
}
