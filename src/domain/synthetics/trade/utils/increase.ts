import { BASIS_POINTS_DIVISOR } from "config/factors";
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
import { BigNumber } from "ethers";
import { FindSwapPath, IncreasePositionAmounts, NextPositionValues } from "../types";
import {
  getAcceptablePriceInfo,
  getDefaultAcceptablePriceImpactBps,
  getMarkPrice,
  getTriggerThresholdType,
} from "./prices";
import { getSwapAmountsByFromValue, getSwapAmountsByToValue } from "./swap";
import { applyFactor } from "lib/numbers";

export function getIncreasePositionAmounts(p: {
  marketInfo: MarketInfo;
  indexToken: TokenData;
  initialCollateralToken: TokenData;
  collateralToken: TokenData;
  isLong: boolean;
  initialCollateralAmount: BigNumber | undefined;
  position: PositionInfo | undefined;
  indexTokenAmount: BigNumber | undefined;
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

  const isLimit = triggerPrice?.gt(0);

  if (triggerPrice?.gt(0)) {
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

  if (!values.indexPrice.gt(0) || !values.initialCollateralPrice.gt(0) || !values.collateralPrice.gt(0)) {
    return values;
  }

  // Size and collateral
  if (strategy === "leverageByCollateral" && leverage && initialCollateralAmount?.gt(0)) {
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
    const baseSizeDeltaUsd = baseCollateralUsd.mul(leverage).div(BASIS_POINTS_DIVISOR);
    const basePriceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, baseSizeDeltaUsd, isLong);
    const basePositionFeeInfo = getPositionFee(
      marketInfo,
      baseSizeDeltaUsd,
      basePriceImpactDeltaUsd.gt(0),
      userReferralInfo
    );
    const baseUiFeeUsd = applyFactor(baseSizeDeltaUsd, uiFeeFactor);
    const totalSwapVolumeUsd = getTotalSwapVolumeFromSwapStats(values.swapPathStats?.swapSteps);
    values.swapUiFeeUsd = applyFactor(totalSwapVolumeUsd, uiFeeFactor);

    values.sizeDeltaUsd = baseCollateralUsd
      .sub(basePositionFeeInfo.positionFeeUsd)
      .sub(baseUiFeeUsd)
      .sub(values.swapUiFeeUsd)
      .mul(leverage)
      .div(BASIS_POINTS_DIVISOR);

    values.indexTokenAmount = convertToTokenAmount(values.sizeDeltaUsd, indexToken.decimals, values.indexPrice)!;

    const positionFeeInfo = getPositionFee(
      marketInfo,
      values.sizeDeltaUsd,
      basePriceImpactDeltaUsd.gt(0),
      userReferralInfo
    );
    values.positionFeeUsd = positionFeeInfo.positionFeeUsd;
    values.feeDiscountUsd = positionFeeInfo.discountUsd;
    values.uiFeeUsd = applyFactor(values.sizeDeltaUsd, uiFeeFactor);

    values.collateralDeltaUsd = baseCollateralUsd
      .sub(values.positionFeeUsd)
      .sub(values.borrowingFeeUsd)
      .sub(values.fundingFeeUsd)
      .sub(values.uiFeeUsd)
      .sub(values.swapUiFeeUsd);

    values.collateralDeltaAmount = convertToTokenAmount(
      values.collateralDeltaUsd,
      collateralToken.decimals,
      values.collateralPrice
    )!;
  } else if (strategy === "leverageBySize" && leverage && indexTokenAmount?.gt(0)) {
    values.estimatedLeverage = leverage;
    values.indexTokenAmount = indexTokenAmount;
    values.sizeDeltaUsd = convertToUsd(indexTokenAmount, indexToken.decimals, values.indexPrice)!;

    const basePriceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, values.sizeDeltaUsd, isLong);

    const positionFeeInfo = getPositionFee(
      marketInfo,
      values.sizeDeltaUsd,
      basePriceImpactDeltaUsd.gt(0),
      userReferralInfo
    );

    values.positionFeeUsd = positionFeeInfo.positionFeeUsd;
    values.feeDiscountUsd = positionFeeInfo.discountUsd;
    values.uiFeeUsd = applyFactor(values.sizeDeltaUsd, uiFeeFactor);

    values.collateralDeltaUsd = values.sizeDeltaUsd.mul(BASIS_POINTS_DIVISOR).div(leverage);
    values.collateralDeltaAmount = convertToTokenAmount(
      values.collateralDeltaUsd,
      collateralToken.decimals,
      values.collateralPrice
    )!;

    const baseCollateralUsd = values.collateralDeltaUsd
      .add(values.positionFeeUsd)
      .add(values.borrowingFeeUsd)
      .add(values.fundingFeeUsd)
      .add(values.uiFeeUsd)
      .add(values.swapUiFeeUsd);

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
    if (indexTokenAmount?.gt(0)) {
      values.indexTokenAmount = indexTokenAmount;
      values.sizeDeltaUsd = convertToUsd(indexTokenAmount, indexToken.decimals, values.indexPrice)!;

      const basePriceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, values.sizeDeltaUsd, isLong);

      const positionFeeInfo = getPositionFee(
        marketInfo,
        values.sizeDeltaUsd,
        basePriceImpactDeltaUsd.gt(0),
        userReferralInfo
      );

      values.positionFeeUsd = positionFeeInfo.positionFeeUsd;
      values.feeDiscountUsd = positionFeeInfo.discountUsd;
      values.uiFeeUsd = applyFactor(values.sizeDeltaUsd, uiFeeFactor);
    }

    if (initialCollateralAmount?.gt(0)) {
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

      values.collateralDeltaUsd = baseCollateralUsd
        .sub(values.positionFeeUsd)
        .sub(values.borrowingFeeUsd)
        .sub(values.fundingFeeUsd)
        .sub(values.uiFeeUsd)
        .sub(values.swapUiFeeUsd);

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
    if (!maxNegativePriceImpactBps) {
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

  if (values.positionPriceImpactDeltaUsd.gt(0)) {
    const price = triggerPrice?.gt(0) ? triggerPrice : indexToken.prices.maxPrice;
    priceImpactAmount = convertToTokenAmount(values.positionPriceImpactDeltaUsd, indexToken.decimals, price)!;
  } else {
    const price = triggerPrice?.gt(0) ? triggerPrice : indexToken.prices.minPrice;
    priceImpactAmount = convertToTokenAmount(values.positionPriceImpactDeltaUsd, indexToken.decimals, price)!;
  }

  values.sizeDeltaInTokens = convertToTokenAmount(values.sizeDeltaUsd, indexToken.decimals, values.indexPrice)!;

  if (isLong) {
    values.sizeDeltaInTokens = values.sizeDeltaInTokens.add(priceImpactAmount);
  } else {
    values.sizeDeltaInTokens = values.sizeDeltaInTokens.sub(priceImpactAmount);
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

  const nextCollateralUsd = existingPosition
    ? existingPosition.collateralUsd.add(collateralDeltaUsd)
    : collateralDeltaUsd;

  const nextCollateralAmount = existingPosition
    ? existingPosition.collateralAmount.add(collateralDeltaAmount)
    : collateralDeltaAmount;

  const nextSizeUsd = existingPosition ? existingPosition.sizeInUsd.add(sizeDeltaUsd) : sizeDeltaUsd;
  const nextSizeInTokens = existingPosition ? existingPosition.sizeInTokens.add(sizeDeltaInTokens) : sizeDeltaInTokens;

  const nextEntryPrice =
    getEntryPrice({
      sizeInUsd: nextSizeUsd,
      sizeInTokens: nextSizeInTokens,
      indexToken: marketInfo.indexToken,
    }) || indexPrice;

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
