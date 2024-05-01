import { BASIS_POINTS_DIVISOR, DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER } from "config/factors";
import { UserReferralInfo } from "domain/referrals";
import { getPositionFee } from "domain/synthetics/fees";
import { Market, MarketInfo } from "domain/synthetics/markets";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import {
  PositionInfo,
  getLeverage,
  getLiquidationPrice,
  getMinCollateralFactorForPosition,
  getPositionPnlUsd,
} from "domain/synthetics/positions";
import { TokenData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { getIsEquivalentTokens } from "domain/tokens";
import { BigNumber, ethers } from "ethers";
import { DUST_USD } from "lib/legacy";
import { applyFactor, getBasisPoints, roundUpDivision } from "lib/numbers";
import { DecreasePositionAmounts, NextPositionValues } from "../types";
import {
  getAcceptablePriceInfo,
  getDefaultAcceptablePriceImpactBps,
  getMarkPrice,
  getTriggerDecreaseOrderType,
  getTriggerThresholdType,
} from "./prices";
import { getSwapStats } from "./swapStats";

export function getDecreasePositionAmounts(p: {
  marketInfo: MarketInfo;
  collateralToken: TokenData;
  isLong: boolean;
  position: PositionInfo | undefined;
  closeSizeUsd: bigint;
  keepLeverage: boolean;
  triggerPrice?: bigint;
  fixedAcceptablePriceImpactBps?: bigint;
  acceptablePriceImpactBuffer?: number;
  userReferralInfo: UserReferralInfo | undefined;
  minCollateralUsd: bigint;
  minPositionSizeUsd: bigint;
  uiFeeFactor: bigint;
  isLimit?: boolean;
  limitPrice?: bigint;
  triggerOrderType?: DecreasePositionAmounts["triggerOrderType"];
}) {
  const {
    marketInfo,
    collateralToken,
    isLong,
    position,
    closeSizeUsd,
    keepLeverage,
    triggerPrice,
    fixedAcceptablePriceImpactBps,
    acceptablePriceImpactBuffer,
    userReferralInfo,
    minCollateralUsd,
    minPositionSizeUsd,
    uiFeeFactor,
    isLimit,
    limitPrice,
    triggerOrderType: orderType,
  } = p;
  const { indexToken } = marketInfo;

  const values: DecreasePositionAmounts = {
    isFullClose: false,
    sizeDeltaUsd: 0n,
    sizeDeltaInTokens: 0n,
    collateralDeltaUsd: 0n,
    collateralDeltaAmount: 0n,

    indexPrice: 0n,
    collateralPrice: 0n,
    triggerPrice: 0n,
    acceptablePrice: 0n,

    positionPriceImpactDeltaUsd: 0n,
    priceImpactDiffUsd: 0n,
    acceptablePriceDeltaBps: 0n,
    recommendedAcceptablePriceDeltaBps: 0n,

    estimatedPnl: 0n,
    estimatedPnlPercentage: 0n,
    realizedPnl: 0n,
    realizedPnlPercentage: 0n,

    positionFeeUsd: 0n,
    uiFeeUsd: 0n,
    swapUiFeeUsd: 0n,
    borrowingFeeUsd: 0n,
    fundingFeeUsd: 0n,
    feeDiscountUsd: 0n,
    swapProfitFeeUsd: 0n,
    payedOutputUsd: 0n,
    payedRemainingCollateralUsd: 0n,
    payedRemainingCollateralAmount: 0n,

    receiveTokenAmount: 0n,
    receiveUsd: 0n,

    triggerOrderType: orderType,
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

    values.triggerOrderType ||= getTriggerDecreaseOrderType({
      markPrice: isLimit ? limitPrice || 0n : markPrice,
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
      fixedAcceptablePriceImpactBps,
      acceptablePriceImpactBuffer,
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

    const totalFeesUsd = 0n
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

  let estimatedCollateralDeltaUsd = 0n;

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
  values.realizedPnlPercentage =
    !estimatedCollateralUsd == 0n ? getBasisPoints(values.realizedPnl, estimatedCollateralUsd) : 0n;
  values.estimatedPnlPercentage =
    !estimatedCollateralUsd == 0n ? getBasisPoints(values.estimatedPnl, estimatedCollateralUsd) : 0n;

  applyAcceptablePrice({
    marketInfo,
    isLong,
    isTrigger,
    fixedAcceptablePriceImpactBps,
    acceptablePriceImpactBuffer,
    values,
  });

  // Profit
  let profitUsd = 0n;
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
    values.swapProfitFeeUsd = 0n;
  }

  const negativePnlUsd = values.realizedPnl.lt(0) ? values.realizedPnl.abs() : 0n;
  const negativePriceImpactUsd = values.positionPriceImpactDeltaUsd.lt(0)
    ? values.positionPriceImpactDeltaUsd.abs()
    : 0n;
  const priceImpactDiffUsd = values.priceImpactDiffUsd.gt(0) ? values.priceImpactDiffUsd : 0n;

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
    values.collateralDeltaUsd = 0n;
    values.collateralDeltaAmount = 0n;
    values.receiveTokenAmount = payedInfo.outputAmount;
  }

  values.receiveUsd = convertToUsd(values.receiveTokenAmount, collateralToken.decimals, values.collateralPrice)!;

  return values;
}

export function getIsFullClose(p: {
  position: PositionInfo;
  sizeDeltaUsd: bigint;
  indexPrice: bigint;
  remainingCollateralUsd: bigint;
  minCollateralUsd: bigint;
  minPositionSizeUsd: bigint;
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

export function getMinCollateralUsdForLeverage(position: PositionInfo, openInterestDelta: BigNumber) {
  const minCollateralFactor = getMinCollateralFactorForPosition(position, openInterestDelta);
  return applyFactor(position.sizeInUsd, minCollateralFactor);
}

export function payForCollateralCost(p: {
  initialCostUsd: bigint;
  collateralToken: TokenData;
  collateralPrice: bigint;
  outputAmount: bigint;
  remainingCollateralAmount: bigint;
}) {
  const { initialCostUsd, collateralToken, collateralPrice, outputAmount, remainingCollateralAmount } = p;

  const values = {
    outputAmount: BigInt(outputAmount),
    remainingCollateralAmount: BigInt(remainingCollateralAmount),
    paidOutputAmount: 0n,
    paidRemainingCollateralAmount: 0n,
  };

  let remainingCostAmount = convertToTokenAmount(initialCostUsd, collateralToken.decimals, collateralPrice)!;

  if (remainingCostAmount == 0n) {
    return values;
  }

  if (values.outputAmount.gt(0)) {
    if (values.outputAmount.gt(remainingCostAmount)) {
      values.outputAmount = values.outputAmount.sub(remainingCostAmount);
      values.paidOutputAmount = remainingCostAmount;
      remainingCostAmount = 0n;
    } else {
      remainingCostAmount = remainingCostAmount.sub(values.outputAmount);
      values.paidOutputAmount = values.outputAmount;
      values.outputAmount = 0n;
    }
  }

  if (remainingCostAmount == 0n) {
    return values;
  }

  if (values.remainingCollateralAmount.gt(remainingCostAmount)) {
    values.remainingCollateralAmount = values.remainingCollateralAmount.sub(remainingCostAmount);
    values.paidRemainingCollateralAmount = remainingCostAmount;
    remainingCostAmount = 0n;
  } else {
    remainingCostAmount = remainingCostAmount.sub(remainingCollateralAmount);
    values.paidRemainingCollateralAmount = values.remainingCollateralAmount;
    values.remainingCollateralAmount = 0n;
  }

  return values;
}

function applyAcceptablePrice(p: {
  marketInfo: MarketInfo;
  isLong: boolean;
  isTrigger: boolean;
  fixedAcceptablePriceImpactBps?: bigint;
  acceptablePriceImpactBuffer?: number;
  values: DecreasePositionAmounts;
}) {
  const { marketInfo, isLong, values, isTrigger, fixedAcceptablePriceImpactBps, acceptablePriceImpactBuffer } = p;

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
        values.acceptablePrice = 0n;
      } else {
        values.acceptablePrice = ethers.constants.MaxUint256;
      }
    } else {
      let maxNegativePriceImpactBps = fixedAcceptablePriceImpactBps;
      values.recommendedAcceptablePriceDeltaBps = getDefaultAcceptablePriceImpactBps({
        isIncrease: false,
        isLong,
        indexPrice: values.indexPrice,
        sizeDeltaUsd: values.sizeDeltaUsd,
        priceImpactDeltaUsd: values.positionPriceImpactDeltaUsd,
        acceptablePriceImapctBuffer: acceptablePriceImpactBuffer || DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER,
      });

      if (!maxNegativePriceImpactBps) {
        maxNegativePriceImpactBps = values.recommendedAcceptablePriceDeltaBps;
      }

      const triggerAcceptablePriceInfo = getAcceptablePriceInfo({
        marketInfo,
        isIncrease: false,
        isLong,
        indexPrice: values.indexPrice,
        sizeDeltaUsd: values.sizeDeltaUsd,
        maxNegativePriceImpactBps,
      });

      values.acceptablePrice = triggerAcceptablePriceInfo.acceptablePrice;
      values.acceptablePriceDeltaBps = triggerAcceptablePriceInfo.acceptablePriceDeltaBps;
    }
  }

  return values;
}

export function estimateCollateralCost(baseUsd: bigint, collateralToken: TokenData, collateralPrice: BigNumber) {
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
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  realizedPnl: bigint;
  estimatedPnl: bigint;
  collateralDeltaUsd: bigint;
  collateralDeltaAmount: bigint;
  payedRemainingCollateralUsd: bigint;
  payedRemainingCollateralAmount: bigint;
  showPnlInLeverage: boolean;
  isLong: boolean;
  minCollateralUsd: bigint;
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

  const nextSizeUsd = existingPosition ? existingPosition.sizeInUsd.sub(sizeDeltaUsd) : 0n;
  const nextSizeInTokens = existingPosition ? existingPosition.sizeInTokens.sub(sizeDeltaInTokens) : 0n;

  let nextCollateralUsd = existingPosition
    ? existingPosition.collateralUsd.sub(collateralDeltaUsd).sub(payedRemainingCollateralUsd)
    : 0n;

  if (nextCollateralUsd.lt(0)) {
    nextCollateralUsd = 0n;
  }

  let nextCollateralAmount = existingPosition
    ? existingPosition.collateralAmount.sub(collateralDeltaAmount).sub(payedRemainingCollateralAmount)
    : 0n;

  if (nextCollateralAmount.lt(0)) {
    nextCollateralAmount = 0n;
  }

  const nextPnl = estimatedPnl ? estimatedPnl.sub(realizedPnl) : 0n;

  const nextPnlPercentage = !nextCollateralUsd == 0n ? getBasisPoints(nextPnl, nextCollateralUsd) : 0n;

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
    sizeInTokens: nextSizeInTokens,
    sizeInUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    collateralAmount: nextCollateralAmount,
    minCollateralUsd,
    userReferralInfo,
    pendingBorrowingFeesUsd: 0n, // deducted on order
    pendingFundingFeesUsd: 0n, // deducted on order
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

export function getExecutionPriceForDecrease(
  triggerPrice: bigint,
  priceImpactUsd: bigint,
  sizeDeltaUsd: bigint,
  isLong: boolean
) {
  if (sizeDeltaUsd == 0n) {
    return null;
  }

  const adjustedPriceImpactUsd = isLong ? priceImpactUsd : priceImpactUsd.mul(-1);
  const adjustment = triggerPrice.mul(adjustedPriceImpactUsd).div(sizeDeltaUsd);
  return triggerPrice.add(adjustment);
}
