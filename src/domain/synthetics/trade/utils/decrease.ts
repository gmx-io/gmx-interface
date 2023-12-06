import { BASIS_POINTS_DIVISOR } from "config/factors";
import { UserReferralInfo } from "domain/referrals";
import { getPositionFee } from "domain/synthetics/fees";
import { Market, MarketInfo } from "domain/synthetics/markets";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { PositionInfo, getLeverage, getLiquidationPrice, getPositionPnlUsd } from "domain/synthetics/positions";
import { TokenData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { getIsEquivalentTokens } from "domain/tokens";
import { BigNumber, ethers } from "ethers";
import { DUST_USD } from "lib/legacy";
import { applyFactor, getBasisPoints, roundUpDivision } from "lib/numbers";
import { DecreasePositionAmounts, NextPositionValues } from "../types";
import { getAcceptablePriceInfo, getMarkPrice, getTriggerDecreaseOrderType, getTriggerThresholdType } from "./prices";
import { getSwapStats } from "./swapStats";

export function getDecreasePositionAmounts(p: {
  marketInfo: MarketInfo;
  collateralToken: TokenData;
  isLong: boolean;
  position: PositionInfo | undefined;
  closeSizeUsd: BigNumber;
  keepLeverage: boolean;
  triggerPrice?: BigNumber;
  savedAcceptablePriceImpactBps?: BigNumber;
  userReferralInfo: UserReferralInfo | undefined;
  minCollateralUsd: BigNumber;
  minPositionSizeUsd: BigNumber;
  uiFeeFactor: BigNumber;
}) {
  const {
    marketInfo,
    collateralToken,
    isLong,
    position,
    closeSizeUsd,
    keepLeverage,
    triggerPrice,
    savedAcceptablePriceImpactBps,
    userReferralInfo,
    minCollateralUsd,
    minPositionSizeUsd,
    uiFeeFactor,
  } = p;
  const { indexToken } = marketInfo;

  const values: DecreasePositionAmounts = {
    isFullClose: false,
    sizeDeltaUsd: BigNumber.from(0),
    sizeDeltaInTokens: BigNumber.from(0),
    collateralDeltaUsd: BigNumber.from(0),
    collateralDeltaAmount: BigNumber.from(0),

    indexPrice: BigNumber.from(0),
    collateralPrice: BigNumber.from(0),
    triggerPrice: BigNumber.from(0),
    acceptablePrice: BigNumber.from(0),

    positionPriceImpactDeltaUsd: BigNumber.from(0),
    priceImpactDiffUsd: BigNumber.from(0),
    acceptablePriceDeltaBps: BigNumber.from(0),

    estimatedPnl: BigNumber.from(0),
    estimatedPnlPercentage: BigNumber.from(0),
    realizedPnl: BigNumber.from(0),

    positionFeeUsd: BigNumber.from(0),
    uiFeeUsd: BigNumber.from(0),
    swapUiFeeUsd: BigNumber.from(0),
    borrowingFeeUsd: BigNumber.from(0),
    fundingFeeUsd: BigNumber.from(0),
    feeDiscountUsd: BigNumber.from(0),
    swapProfitFeeUsd: BigNumber.from(0),
    payedOutputUsd: BigNumber.from(0),
    payedRemainingCollateralUsd: BigNumber.from(0),
    payedRemainingCollateralAmount: BigNumber.from(0),

    receiveTokenAmount: BigNumber.from(0),
    receiveUsd: BigNumber.from(0),

    triggerOrderType: undefined,
    triggerThresholdType: undefined,
    decreaseSwapType: DecreasePositionSwapType.NoSwap,
  };

  const pnlToken = isLong ? marketInfo.longToken : marketInfo.shortToken;

  values.decreaseSwapType = getIsEquivalentTokens(pnlToken, collateralToken)
    ? DecreasePositionSwapType.NoSwap
    : DecreasePositionSwapType.SwapPnlTokenToCollateralToken;

  const markPrice = getMarkPrice({ prices: indexToken.prices, isIncrease: false, isLong });
  const isTrigger = Boolean(triggerPrice?.gt(0));

  if (triggerPrice?.gt(0)) {
    values.triggerPrice = triggerPrice;
    values.indexPrice = triggerPrice;

    values.collateralPrice = getIsEquivalentTokens(indexToken, collateralToken)
      ? triggerPrice
      : collateralToken.prices.minPrice;

    values.triggerOrderType = getTriggerDecreaseOrderType({
      markPrice,
      triggerPrice,
      isLong,
    });

    values.triggerThresholdType = getTriggerThresholdType(values.triggerOrderType, isLong);
  } else {
    values.indexPrice = markPrice;
    values.collateralPrice = collateralToken.prices.minPrice;
  }

  if (!closeSizeUsd.gt(0)) {
    return values;
  }

  values.sizeDeltaUsd = closeSizeUsd;

  if (!position) {
    applyAcceptablePrice({
      marketInfo,
      isLong,
      isTrigger,
      savedAcceptablePriceImpactBps,
      values,
    });

    const positionFeeInfo = getPositionFee(
      marketInfo,
      values.sizeDeltaUsd,
      values.positionPriceImpactDeltaUsd.gt(0),
      userReferralInfo
    );

    values.positionFeeUsd = positionFeeInfo.positionFeeUsd;
    values.feeDiscountUsd = positionFeeInfo.discountUsd;
    values.uiFeeUsd = applyFactor(values.sizeDeltaUsd, uiFeeFactor);

    const totalFeesUsd = BigNumber.from(0)
      .add(values.positionFeeUsd)
      .add(values.uiFeeUsd)
      .add(values.positionPriceImpactDeltaUsd.lt(0) ? values.positionPriceImpactDeltaUsd : 0);

    values.payedOutputUsd = totalFeesUsd;

    return values;
  }

  const estimatedCollateralUsd = convertToUsd(
    position.collateralAmount,
    collateralToken.decimals,
    values.collateralPrice
  )!;

  let estimatedCollateralDeltaUsd = BigNumber.from(0);

  if (keepLeverage && position.sizeInUsd.gt(0)) {
    estimatedCollateralDeltaUsd = values.sizeDeltaUsd.mul(estimatedCollateralUsd).div(position.sizeInUsd);
  }

  values.isFullClose = getIsFullClose({
    position,
    sizeDeltaUsd: values.sizeDeltaUsd,
    indexPrice: values.indexPrice,
    remainingCollateralUsd: estimatedCollateralUsd.sub(estimatedCollateralDeltaUsd),
    minCollateralUsd,
    minPositionSizeUsd,
  });

  if (values.isFullClose) {
    values.sizeDeltaUsd = position.sizeInUsd;
    values.sizeDeltaInTokens = position.sizeInTokens;
  } else {
    if (position.isLong) {
      values.sizeDeltaInTokens = roundUpDivision(position.sizeInTokens.mul(values.sizeDeltaUsd), position.sizeInUsd);
    } else {
      values.sizeDeltaInTokens = position.sizeInTokens.mul(values.sizeDeltaUsd).div(position.sizeInUsd);
    }
  }

  // PNL
  values.estimatedPnl = getPositionPnlUsd({
    marketInfo,
    sizeInUsd: position.sizeInUsd,
    sizeInTokens: position.sizeInTokens,
    markPrice: values.indexPrice,
    isLong,
  });

  values.realizedPnl = values.estimatedPnl.mul(values.sizeDeltaInTokens).div(position.sizeInTokens);
  values.estimatedPnlPercentage = !estimatedCollateralUsd.eq(0)
    ? getBasisPoints(values.estimatedPnl, estimatedCollateralUsd)
    : BigNumber.from(0);

  applyAcceptablePrice({
    marketInfo,
    isLong,
    isTrigger,
    savedAcceptablePriceImpactBps,
    values,
  });

  // Profit
  let profitUsd = BigNumber.from(0);
  if (values.realizedPnl.gt(0)) {
    profitUsd = profitUsd.add(values.realizedPnl);
  }
  if (values.positionPriceImpactDeltaUsd.gt(0)) {
    profitUsd = profitUsd.add(values.positionPriceImpactDeltaUsd);
  }
  const profitAmount = convertToTokenAmount(profitUsd, collateralToken.decimals, values.collateralPrice)!;

  // Fees
  const positionFeeInfo = getPositionFee(
    marketInfo,
    values.sizeDeltaUsd,
    values.positionPriceImpactDeltaUsd.gt(0),
    userReferralInfo
  );
  const estimatedPositionFeeCost = estimateCollateralCost(
    positionFeeInfo.positionFeeUsd,
    collateralToken,
    values.collateralPrice
  );
  const estimatedDiscountCost = estimateCollateralCost(
    positionFeeInfo.discountUsd,
    collateralToken,
    values.collateralPrice
  );

  values.positionFeeUsd = estimatedPositionFeeCost.usd;
  values.feeDiscountUsd = estimatedDiscountCost.usd;
  values.uiFeeUsd = applyFactor(values.sizeDeltaUsd, uiFeeFactor);

  const borrowFeeCost = estimateCollateralCost(
    position.pendingBorrowingFeesUsd,
    collateralToken,
    values.collateralPrice
  );

  values.borrowingFeeUsd = borrowFeeCost.usd;

  const fundingFeeCost = estimateCollateralCost(
    position.pendingFundingFeesUsd,
    collateralToken,
    values.collateralPrice
  );

  values.fundingFeeUsd = fundingFeeCost.usd;

  if (profitUsd.gt(0) && values.decreaseSwapType === DecreasePositionSwapType.SwapPnlTokenToCollateralToken) {
    const swapProfitStats = getSwapStats({
      marketInfo,
      tokenInAddress: pnlToken.address,
      tokenOutAddress: collateralToken.address,
      usdIn: profitUsd,
      shouldApplyPriceImpact: true,
    });

    values.swapProfitFeeUsd = swapProfitStats.swapFeeUsd.add(swapProfitStats.priceImpactDeltaUsd.mul(-1));
    values.swapUiFeeUsd = applyFactor(swapProfitStats.usdIn, uiFeeFactor);
  } else {
    values.swapProfitFeeUsd = BigNumber.from(0);
  }

  const negativePnlUsd = values.realizedPnl.lt(0) ? values.realizedPnl.abs() : BigNumber.from(0);
  const negativePriceImpactUsd = values.positionPriceImpactDeltaUsd.lt(0)
    ? values.positionPriceImpactDeltaUsd.abs()
    : BigNumber.from(0);
  const priceImpactDiffUsd = values.priceImpactDiffUsd.gt(0) ? values.priceImpactDiffUsd : BigNumber.from(0);

  const totalFeesUsd = values.positionFeeUsd
    .add(values.borrowingFeeUsd)
    .add(values.fundingFeeUsd)
    .add(values.swapProfitFeeUsd)
    .add(values.swapUiFeeUsd)
    .add(values.uiFeeUsd)
    .add(negativePnlUsd)
    .add(negativePriceImpactUsd)
    .add(priceImpactDiffUsd);

  const payedInfo = payForCollateralCost({
    initialCostUsd: totalFeesUsd,
    collateralToken,
    collateralPrice: values.collateralPrice,
    outputAmount: profitAmount,
    remainingCollateralAmount: position.collateralAmount,
  });

  values.payedOutputUsd = convertToUsd(payedInfo.paidOutputAmount, collateralToken.decimals, values.collateralPrice)!;
  values.payedRemainingCollateralAmount = payedInfo.paidRemainingCollateralAmount;
  values.payedRemainingCollateralUsd = convertToUsd(
    payedInfo.paidRemainingCollateralAmount,
    collateralToken.decimals,
    values.collateralPrice
  )!;

  values.receiveTokenAmount = payedInfo.outputAmount;

  // Collateral delta
  if (values.isFullClose) {
    values.collateralDeltaUsd = estimatedCollateralUsd;
    values.collateralDeltaAmount = position.collateralAmount;
    values.receiveTokenAmount = payedInfo.outputAmount.add(payedInfo.remainingCollateralAmount);
  } else if (
    keepLeverage &&
    position.sizeInUsd.gt(0) &&
    estimatedCollateralUsd.gt(0) &&
    payedInfo.remainingCollateralAmount.gt(0)
  ) {
    const remainingCollateralUsd = convertToUsd(
      payedInfo.remainingCollateralAmount,
      collateralToken.decimals,
      values.collateralPrice
    )!;
    const nextSizeInUsd = position.sizeInUsd.sub(values.sizeDeltaUsd);
    const leverageWithoutPnl = getLeverage({
      sizeInUsd: position.sizeInUsd,
      collateralUsd: estimatedCollateralUsd,
      pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
      pendingFundingFeesUsd: position.pendingFundingFeesUsd,
      pnl: undefined,
    })!;

    values.collateralDeltaUsd = remainingCollateralUsd.sub(
      nextSizeInUsd.mul(BASIS_POINTS_DIVISOR).div(leverageWithoutPnl)
    );
    values.collateralDeltaAmount = convertToTokenAmount(
      values.collateralDeltaUsd,
      collateralToken.decimals,
      values.collateralPrice
    )!;
    values.receiveTokenAmount = payedInfo.outputAmount.add(values.collateralDeltaAmount);
  } else {
    values.collateralDeltaUsd = BigNumber.from(0);
    values.collateralDeltaAmount = BigNumber.from(0);
    values.receiveTokenAmount = payedInfo.outputAmount;
  }

  values.receiveUsd = convertToUsd(values.receiveTokenAmount, collateralToken.decimals, values.collateralPrice)!;

  return values;
}

export function getIsFullClose(p: {
  position: PositionInfo;
  sizeDeltaUsd: BigNumber;
  indexPrice: BigNumber;
  remainingCollateralUsd: BigNumber;
  minCollateralUsd: BigNumber;
  minPositionSizeUsd: BigNumber;
}) {
  const { position, sizeDeltaUsd, indexPrice, remainingCollateralUsd, minCollateralUsd, minPositionSizeUsd } = p;
  const { marketInfo, isLong } = position;

  if (position.sizeInUsd.sub(sizeDeltaUsd).lt(DUST_USD)) {
    return true;
  }

  const estimatedPnl = getPositionPnlUsd({
    marketInfo,
    sizeInUsd: position.sizeInUsd,
    sizeInTokens: position.sizeInTokens,
    markPrice: indexPrice,
    isLong,
  });

  const realizedPnl = estimatedPnl.mul(sizeDeltaUsd).div(position.sizeInUsd);

  const estimatedRemainingPnl = estimatedPnl.sub(realizedPnl);

  if (realizedPnl.lt(0)) {
    const estimatedRemainingCollateralUsd = remainingCollateralUsd.sub(realizedPnl);

    let minCollateralFactor = isLong
      ? marketInfo.minCollateralFactorForOpenInterestLong
      : marketInfo.minCollateralFactorForOpenInterestShort;

    const minCollateralFactorForMarket = marketInfo.minCollateralFactor;

    if (minCollateralFactorForMarket.gt(minCollateralFactor)) {
      minCollateralFactor = minCollateralFactorForMarket;
    }

    const minCollateralUsdForLeverage = applyFactor(position.sizeInUsd, minCollateralFactor);
    const willCollateralBeSufficient = estimatedRemainingCollateralUsd.gte(minCollateralUsdForLeverage);

    if (!willCollateralBeSufficient) {
      if (
        estimatedRemainingCollateralUsd.add(estimatedRemainingPnl).lt(minCollateralUsd) ||
        position.sizeInUsd.sub(sizeDeltaUsd).lt(minPositionSizeUsd)
      ) {
        return true;
      }
    }
  }

  return false;
}

export function checkWillCollateralBeSufficient(p: {
  position: PositionInfo;
  realizedPnl: BigNumber;
  remainingCollateralUsd: BigNumber;
  minCollateralUsd: BigNumber;
}) {
  const { position, realizedPnl, remainingCollateralUsd, minCollateralUsd } = p;

  let estimatedRemainingCollateralUsd = BigNumber.from(remainingCollateralUsd);

  if (realizedPnl.lt(0)) {
    estimatedRemainingCollateralUsd = estimatedRemainingCollateralUsd.sub(realizedPnl);
  }

  if (estimatedRemainingCollateralUsd.lt(minCollateralUsd)) {
    return false;
  }

  const minCollateralUsdForLeverage = getMinCollateralUsdForLeverage(position);
  const willCollateralBeSufficient = estimatedRemainingCollateralUsd.gte(minCollateralUsdForLeverage);

  return willCollateralBeSufficient;
}

export function getMinCollateralUsdForLeverage(position: PositionInfo) {
  const { marketInfo, isLong } = position;

  let minCollateralFactor = isLong
    ? marketInfo.minCollateralFactorForOpenInterestLong
    : marketInfo.minCollateralFactorForOpenInterestShort;

  const minCollateralFactorForMarket = marketInfo.minCollateralFactor;

  if (minCollateralFactorForMarket.gt(minCollateralFactor)) {
    minCollateralFactor = minCollateralFactorForMarket;
  }

  const minCollateralUsdForLeverage = applyFactor(position.sizeInUsd, minCollateralFactor);

  return minCollateralUsdForLeverage;
}

export function payForCollateralCost(p: {
  initialCostUsd: BigNumber;
  collateralToken: TokenData;
  collateralPrice: BigNumber;
  outputAmount: BigNumber;
  remainingCollateralAmount: BigNumber;
}) {
  const { initialCostUsd, collateralToken, collateralPrice, outputAmount, remainingCollateralAmount } = p;

  const values = {
    outputAmount: BigNumber.from(outputAmount),
    remainingCollateralAmount: BigNumber.from(remainingCollateralAmount),
    paidOutputAmount: BigNumber.from(0),
    paidRemainingCollateralAmount: BigNumber.from(0),
  };

  let remainingCostAmount = convertToTokenAmount(initialCostUsd, collateralToken.decimals, collateralPrice)!;

  if (remainingCostAmount.eq(0)) {
    return values;
  }

  if (values.outputAmount.gt(0)) {
    if (values.outputAmount.gt(remainingCostAmount)) {
      values.outputAmount = values.outputAmount.sub(remainingCostAmount);
      values.paidOutputAmount = remainingCostAmount;
      remainingCostAmount = BigNumber.from(0);
    } else {
      remainingCostAmount = remainingCostAmount.sub(values.outputAmount);
      values.paidOutputAmount = values.outputAmount;
      values.outputAmount = BigNumber.from(0);
    }
  }

  if (remainingCostAmount.eq(0)) {
    return values;
  }

  if (values.remainingCollateralAmount.gt(remainingCostAmount)) {
    values.remainingCollateralAmount = values.remainingCollateralAmount.sub(remainingCostAmount);
    values.paidRemainingCollateralAmount = remainingCostAmount;
    remainingCostAmount = BigNumber.from(0);
  } else {
    remainingCostAmount = remainingCostAmount.sub(remainingCollateralAmount);
    values.paidRemainingCollateralAmount = values.remainingCollateralAmount;
    values.remainingCollateralAmount = BigNumber.from(0);
  }

  return values;
}

function applyAcceptablePrice(p: {
  marketInfo: MarketInfo;
  isLong: boolean;
  isTrigger: boolean;
  savedAcceptablePriceImpactBps?: BigNumber;
  values: DecreasePositionAmounts;
}) {
  const { marketInfo, isLong, values, isTrigger, savedAcceptablePriceImpactBps } = p;

  const acceptablePriceInfo = getAcceptablePriceInfo({
    marketInfo,
    isIncrease: false,
    isLong,
    indexPrice: values.indexPrice,
    sizeDeltaUsd: values.sizeDeltaUsd,
  });

  values.positionPriceImpactDeltaUsd = acceptablePriceInfo.priceImpactDeltaUsd;
  values.acceptablePrice = acceptablePriceInfo.acceptablePrice;
  values.acceptablePriceDeltaBps = acceptablePriceInfo.acceptablePriceDeltaBps;
  values.priceImpactDiffUsd = acceptablePriceInfo.priceImpactDiffUsd;

  if (isTrigger) {
    if (values.triggerOrderType === OrderType.StopLossDecrease) {
      if (isLong) {
        values.acceptablePrice = BigNumber.from(0);
      } else {
        values.acceptablePrice = ethers.constants.MaxUint256;
      }
    } else {
      const triggerAcceptablePriceInfo = getAcceptablePriceInfo({
        marketInfo,
        isIncrease: false,
        isLong,
        indexPrice: values.indexPrice,
        sizeDeltaUsd: values.sizeDeltaUsd,
        maxNegativePriceImpactBps: savedAcceptablePriceImpactBps,
      });

      values.acceptablePrice = triggerAcceptablePriceInfo.acceptablePrice;
      values.acceptablePriceDeltaBps = triggerAcceptablePriceInfo.acceptablePriceDeltaBps;
      values.priceImpactDiffUsd = triggerAcceptablePriceInfo.priceImpactDiffUsd;

      if (values.positionPriceImpactDeltaUsd.lt(triggerAcceptablePriceInfo.priceImpactDeltaUsd)) {
        values.positionPriceImpactDeltaUsd = triggerAcceptablePriceInfo.priceImpactDeltaUsd;
      }
    }
  }

  return values;
}

export function estimateCollateralCost(baseUsd: BigNumber, collateralToken: TokenData, collateralPrice: BigNumber) {
  const amount = convertToTokenAmount(baseUsd, collateralToken.decimals, collateralToken.prices.minPrice)!;
  const usd = convertToUsd(amount, collateralToken.decimals, collateralPrice)!;

  return {
    amount,
    usd,
  };
}

export function getDecreaseSwapType(p: { market: Market; collateralTokenAddress: string; isLong: boolean }) {
  const { market, collateralTokenAddress, isLong } = p;

  const pnlTokenAddress = isLong ? market.longTokenAddress : market.shortTokenAddress;

  if (pnlTokenAddress !== collateralTokenAddress) {
    return DecreasePositionSwapType.SwapPnlTokenToCollateralToken;
  }

  return DecreasePositionSwapType.NoSwap;
}

export function getNextPositionValuesForDecreaseTrade(p: {
  existingPosition?: PositionInfo;
  marketInfo: MarketInfo;
  collateralToken: TokenData;
  sizeDeltaUsd: BigNumber;
  sizeDeltaInTokens: BigNumber;
  realizedPnl: BigNumber;
  estimatedPnl: BigNumber;
  collateralDeltaUsd: BigNumber;
  collateralDeltaAmount: BigNumber;
  payedRemainingCollateralUsd: BigNumber;
  payedRemainingCollateralAmount: BigNumber;
  showPnlInLeverage: boolean;
  isLong: boolean;
  minCollateralUsd: BigNumber;
  userReferralInfo: UserReferralInfo | undefined;
}): NextPositionValues {
  const {
    existingPosition,
    marketInfo,
    collateralToken,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    realizedPnl,
    estimatedPnl,
    collateralDeltaUsd,
    collateralDeltaAmount,
    payedRemainingCollateralUsd,
    payedRemainingCollateralAmount,
    showPnlInLeverage,
    isLong,
    minCollateralUsd,
    userReferralInfo,
  } = p;

  const nextSizeUsd = existingPosition ? existingPosition.sizeInUsd.sub(sizeDeltaUsd) : BigNumber.from(0);
  const nextSizeInTokens = existingPosition ? existingPosition.sizeInTokens.sub(sizeDeltaInTokens) : BigNumber.from(0);

  let nextCollateralUsd = existingPosition
    ? existingPosition.collateralUsd.sub(collateralDeltaUsd).sub(payedRemainingCollateralUsd)
    : BigNumber.from(0);

  if (nextCollateralUsd.lt(0)) {
    nextCollateralUsd = BigNumber.from(0);
  }

  let nextCollateralAmount = existingPosition
    ? existingPosition.collateralAmount.sub(collateralDeltaAmount).sub(payedRemainingCollateralAmount)
    : BigNumber.from(0);

  if (nextCollateralAmount.lt(0)) {
    nextCollateralAmount = BigNumber.from(0);
  }

  const nextPnl = estimatedPnl ? estimatedPnl.sub(realizedPnl) : BigNumber.from(0);

  const nextPnlPercentage = !nextCollateralUsd.eq(0) ? getBasisPoints(nextPnl, nextCollateralUsd) : BigNumber.from(0);

  const nextLeverage = getLeverage({
    sizeInUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    pnl: showPnlInLeverage ? nextPnl : undefined,
    pendingBorrowingFeesUsd: BigNumber.from(0), // deducted on order
    pendingFundingFeesUsd: BigNumber.from(0), // deducted on order
  });

  const nextLiqPrice = getLiquidationPrice({
    marketInfo,
    collateralToken,
    sizeInTokens: nextSizeInTokens,
    sizeInUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    collateralAmount: nextCollateralAmount,
    minCollateralUsd,
    userReferralInfo,
    pendingBorrowingFeesUsd: BigNumber.from(0), // deducted on order
    pendingFundingFeesUsd: BigNumber.from(0), // deducted on order
    isLong: isLong,
  });

  return {
    nextSizeUsd,
    nextCollateralUsd,
    nextLiqPrice,
    nextPnl,
    nextPnlPercentage,
    nextLeverage,
  };
}
