import { BN_ZERO, DUST_USD, MAX_SIGNED_USD, ONE_USD } from '@/config/constants';
import { DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER } from '@/config/factors';
import { MarketInfo } from '@/selectors/market/types';
import { OrderType } from '@/selectors/order/types';
import { PositionInfo } from '@/selectors/position/types';
import { TokenData } from '@/selectors/token/types';
import { FindSwapPath } from '@/selectors/trade/types';
import { getBasisPoints } from '@/utils/legacy/common';
import {
  convertTokenAmountToUsd,
  convertUsdToTokenAmount,
} from '@/utils/legacy/convert';
import { roundUpDivision } from '@/utils/legacy/decimals';
import { applyFactor } from '@/utils/legacy/factor';
import { getMarketMarkPrice } from '@/utils/market/getMarketMarkPrice';
import { getTriggerThresholdType } from '@/utils/order/getTriggerThresholdType';
import { getPositionFeeUsd } from '@/utils/position/getPositionFeeUsd';
import { getPositionLeverage } from '@/utils/position/getPositionLeverage';
import { getPositionPnlUsd } from '@/utils/position/getPositionPnlUsd';
import { getIsEquivalentTokens } from '@/utils/token/getIsEquivalentTokens';
import { getAcceptablePriceImpactBpsDefault } from '@/utils/tradebox/getAcceptablePriceImpactBpsDefault';
import { getAcceptablePriceInfo } from '@/utils/tradebox/getAcceptablePriceInfo';
import { getDecreaseSwapType } from '@/utils/tradebox/getDecreaseSwapType';
import { getDecreaseTriggerOrderType } from '@/utils/tradebox/getDecreaseTriggerOrderType';
import { getSwapAmountsByFromValue } from '@/utils/tradebox/getSwapAmountsByFromValue';
import { getSwapStats } from '@/utils/tradebox/getSwapStats';
import {
  DecreasePositionAmounts,
  DecreasePositionSwapType,
} from '@/utils/tradebox/types';
import { BN } from '@coral-xyz/anchor';

export function getDecreasePositionAmounts(p: {
  marketInfo: MarketInfo;
  collateralToken?: TokenData;
  receiveToken?: TokenData;
  isLong: boolean;
  position: PositionInfo | undefined;
  closeSizeUsd: BN;
  keepLeverage: boolean;
  triggerPrice?: BN;
  fixedAcceptablePriceImpactBps?: number;
  acceptablePriceImpactBuffer?: number;
  minCollateralUsd: BN;
  minPositionSizeUsd: BN;
  isLimit?: boolean;
  limitPrice?: BN;
  triggerOrderType?: DecreasePositionAmounts['triggerOrderType'];
  feeDiscountFactor: BN;
  wrappedNativeToken: TokenData;
  findSwapPath?: FindSwapPath;
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
    minCollateralUsd,
    minPositionSizeUsd,
    triggerOrderType: orderType,
    receiveToken: receiveTokenArg,
    feeDiscountFactor,
    wrappedNativeToken,
    findSwapPath,
  } = p;

  const values: DecreasePositionAmounts = {
    isFullClose: false,
    sizeDeltaUsd: BN_ZERO,
    sizeDeltaInTokens: BN_ZERO,
    collateralDeltaUsd: BN_ZERO,
    collateralDeltaAmount: BN_ZERO,

    swapPathStats: undefined,

    indexPrice: BN_ZERO,
    collateralPrice: BN_ZERO,
    triggerPrice: BN_ZERO,
    acceptablePrice: BN_ZERO,

    positionPriceImpactDeltaUsd: BN_ZERO,
    priceImpactDiffUsd: BN_ZERO,
    acceptablePriceDeltaBps: 0,
    recommendedAcceptablePriceDeltaBps: 0,

    estimatedPnl: BN_ZERO,
    estimatedPnlPercentage: 0,
    realizedPnl: BN_ZERO,
    realizedPnlPercentage: 0,

    positionFeeUsd: BN_ZERO,
    gtRewardsUsd: BN_ZERO,
    feeDiscountUsd: BN_ZERO,
    borrowingFeeUsd: BN_ZERO,
    fundingFeeUsd: BN_ZERO,
    swapProfitFeeUsd: BN_ZERO,
    payedOutputUsd: BN_ZERO,
    payedRemainingCollateralUsd: BN_ZERO,
    payedRemainingCollateralAmount: BN_ZERO,

    receiveTokenAmount: BN_ZERO,
    receiveUsd: BN_ZERO,

    triggerOrderType: orderType,
    triggerThresholdType: undefined,
    decreaseSwapType: DecreasePositionSwapType.NoSwap,
  };

  if (!collateralToken) {
    return values;
  }

  const { indexToken } = marketInfo;
  const receiveToken =
    receiveTokenArg?.isNative && wrappedNativeToken
      ? wrappedNativeToken
      : (receiveTokenArg ?? collateralToken);
  const pnlToken = isLong ? marketInfo.longToken : marketInfo.shortToken;

  values.decreaseSwapType = getDecreaseSwapType(
    pnlToken,
    collateralToken,
    receiveToken
  );

  const markPrice = getMarketMarkPrice({
    prices: indexToken.prices,
    isIncrease: false,
    isLong,
  });
  const isTrigger = Boolean(
    triggerPrice !== undefined && triggerPrice.gt(BN_ZERO)
  );

  if (isTrigger) {
    values.triggerPrice = triggerPrice ?? BN_ZERO;
    values.indexPrice = triggerPrice ?? BN_ZERO;

    values.collateralPrice = getIsEquivalentTokens(indexToken, collateralToken)
      ? (triggerPrice ?? BN_ZERO)
      : (collateralToken.prices.minPrice ?? BN_ZERO);

    values.triggerOrderType = getDecreaseTriggerOrderType({
      markPrice: markPrice,
      triggerPrice: values.triggerPrice,
      isLong,
    });

    values.triggerThresholdType = getTriggerThresholdType(
      values.triggerOrderType,
      isLong
    );

    const swapAmounts = findSwapPath
      ? getSwapAmountsByFromValue({
          tokenInRaw: collateralToken,
          tokenOutRaw: receiveToken,
          amountIn: values.sizeDeltaUsd,
          isLimit: false,
          findSwapPath,
          wrappedNativeToken,
        })
      : undefined;

    values.swapPathStats = swapAmounts?.swapPathStats;
  } else {
    values.indexPrice = markPrice;
    values.collateralPrice = collateralToken.prices.minPrice;
  }

  if (closeSizeUsd.lte(BN_ZERO)) {
    return values;
  }

  values.sizeDeltaUsd = closeSizeUsd;

  if (
    !position ||
    position.sizeInUsd.lte(BN_ZERO) ||
    position.sizeInTokens.lte(BN_ZERO)
  ) {
    applyAcceptablePrice({
      marketInfo,
      isLong,
      isTrigger,
      fixedAcceptablePriceImpactBps,
      acceptablePriceImpactBuffer,
      values,
    });

    const positionFeeUsd = getPositionFeeUsd(
      marketInfo,
      values.sizeDeltaUsd,
      values.positionPriceImpactDeltaUsd.gt(BN_ZERO)
    );

    values.positionFeeUsd = positionFeeUsd;
    values.feeDiscountUsd = positionFeeUsd.mul(feeDiscountFactor).div(ONE_USD);
    values.gtRewardsUsd = positionFeeUsd.sub(values.feeDiscountUsd);
    const totalFeesUsd = values.positionFeeUsd.add(
      values.positionPriceImpactDeltaUsd.lt(BN_ZERO)
        ? values.positionPriceImpactDeltaUsd
        : BN_ZERO
    );

    values.payedOutputUsd = totalFeesUsd;

    return values;
  }

  const estimatedCollateralUsd = convertTokenAmountToUsd(
    position.collateralAmount,
    collateralToken.decimals,
    values.collateralPrice
  );

  let estimatedCollateralDeltaUsd = BN_ZERO;

  if (keepLeverage && position.sizeInUsd.gt(BN_ZERO)) {
    estimatedCollateralDeltaUsd = values.sizeDeltaUsd
      .mul(estimatedCollateralUsd)
      .div(position.sizeInUsd);
  }

  values.isFullClose = getIsFullClose({
    position,
    sizeDeltaUsd: values.sizeDeltaUsd,
    indexPrice: values.indexPrice,
    remainingCollateralUsd: estimatedCollateralUsd.sub(
      estimatedCollateralDeltaUsd
    ),
    minCollateralUsd,
    minPositionSizeUsd,
  });

  if (values.isFullClose) {
    values.sizeDeltaUsd = position.sizeInUsd;
    values.sizeDeltaInTokens = position.sizeInTokens;
  } else {
    if (position.isLong) {
      values.sizeDeltaInTokens = roundUpDivision(
        position.sizeInTokens.mul(values.sizeDeltaUsd),
        position.sizeInUsd
      );
    } else {
      values.sizeDeltaInTokens = roundUpDivision(
        position.sizeInTokens.mul(values.sizeDeltaUsd),
        position.sizeInUsd
      );
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

  if (position.sizeInUsd.gt(BN_ZERO)) {
    values.realizedPnl = values.estimatedPnl
      .mul(values.sizeDeltaInTokens)
      .div(position.sizeInTokens);
  }
  values.realizedPnlPercentage = estimatedCollateralUsd.gt(BN_ZERO)
    ? getBasisPoints(values.realizedPnl, estimatedCollateralUsd)
    : 0;
  values.estimatedPnlPercentage = estimatedCollateralUsd.gt(BN_ZERO)
    ? getBasisPoints(values.estimatedPnl, estimatedCollateralUsd)
    : 0;

  applyAcceptablePrice({
    marketInfo,
    isLong,
    isTrigger,
    fixedAcceptablePriceImpactBps,
    acceptablePriceImpactBuffer,
    values,
  });

  // Profit
  let profitUsd = BN_ZERO;
  if (values.realizedPnl.gt(BN_ZERO)) {
    profitUsd = profitUsd.add(values.realizedPnl);
  }
  if (values.positionPriceImpactDeltaUsd.gt(BN_ZERO)) {
    profitUsd = profitUsd.add(values.positionPriceImpactDeltaUsd);
  }
  const profitAmount =
    convertUsdToTokenAmount(
      profitUsd,
      collateralToken.decimals,
      values.collateralPrice
    ) ?? BN_ZERO;

  // Fees
  const positionFeeUsd = getPositionFeeUsd(
    marketInfo,
    values.sizeDeltaUsd,
    values.positionPriceImpactDeltaUsd.gt(BN_ZERO)
  );
  const estimatedPositionFeeCost = estimateCollateralCost(
    positionFeeUsd,
    collateralToken,
    values.collateralPrice
  );

  values.positionFeeUsd = estimatedPositionFeeCost.usd;
  values.feeDiscountUsd = positionFeeUsd.mul(feeDiscountFactor).div(ONE_USD);
  values.gtRewardsUsd = positionFeeUsd.sub(values.feeDiscountUsd);

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

  if (
    profitUsd.gt(BN_ZERO) &&
    values.decreaseSwapType ===
      DecreasePositionSwapType.SwapPnlTokenToCollateralToken
  ) {
    const swapProfitStats = getSwapStats({
      marketInfo,
      tokenInAddress: pnlToken.address.toBase58(),
      tokenOutAddress: collateralToken.address.toBase58(),
      usdIn: profitUsd,
      shouldApplyPriceImpact: true,
    });

    values.swapProfitFeeUsd = swapProfitStats.swapFeeUsd.sub(
      swapProfitStats.priceImpactDeltaUsd
    );
  } else {
    values.swapProfitFeeUsd = BN_ZERO;
  }

  const negativePnlUsd = values.realizedPnl.lt(BN_ZERO)
    ? values.realizedPnl.abs()
    : BN_ZERO;
  const negativePriceImpactUsd = values.positionPriceImpactDeltaUsd.lt(BN_ZERO)
    ? values.positionPriceImpactDeltaUsd.abs()
    : BN_ZERO;
  const priceImpactDiffUsd = values.priceImpactDiffUsd.gt(BN_ZERO)
    ? values.priceImpactDiffUsd
    : BN_ZERO;

  const totalFeesUsd = values.positionFeeUsd
    .add(values.borrowingFeeUsd)
    .add(values.fundingFeeUsd)
    .add(values.swapProfitFeeUsd)
    .add(negativePnlUsd)
    .add(negativePriceImpactUsd)
    .add(priceImpactDiffUsd)
    .add(values.gtRewardsUsd)
    .add(values.feeDiscountUsd);

  const payedInfo = payForCollateralCost({
    initialCostUsd: totalFeesUsd,
    collateralToken,
    collateralPrice: values.collateralPrice,
    outputAmount: profitAmount,
    remainingCollateralAmount: position.collateralAmount,
  });

  values.payedOutputUsd = convertTokenAmountToUsd(
    payedInfo.paidOutputAmount,
    collateralToken.decimals,
    values.collateralPrice
  )!;
  values.payedRemainingCollateralAmount =
    payedInfo.paidRemainingCollateralAmount;
  values.payedRemainingCollateralUsd = convertTokenAmountToUsd(
    payedInfo.paidRemainingCollateralAmount,
    collateralToken.decimals,
    values.collateralPrice
  )!;

  values.receiveTokenAmount = payedInfo.outputAmount;

  // Collateral delta
  if (values.isFullClose) {
    values.collateralDeltaUsd = estimatedCollateralUsd;
    values.collateralDeltaAmount = position.collateralAmount;
    values.receiveTokenAmount = payedInfo.outputAmount.add(
      payedInfo.remainingCollateralAmount
    );
  } else if (
    keepLeverage &&
    position.sizeInUsd.gt(BN_ZERO) &&
    estimatedCollateralUsd.gt(BN_ZERO) &&
    payedInfo.remainingCollateralAmount.gt(BN_ZERO)
  ) {
    const remainingCollateralUsd = convertTokenAmountToUsd(
      payedInfo.remainingCollateralAmount,
      collateralToken.decimals,
      values.collateralPrice
    );
    const nextSizeInUsd = position.sizeInUsd.sub(values.sizeDeltaUsd);
    const leverageWithoutPnl = getPositionLeverage({
      sizeInUsd: position.sizeInUsd,
      collateralUsd: estimatedCollateralUsd,
      pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
      pendingFundingFeesUsd: position.pendingFundingFeesUsd,
      pnl: undefined,
    });

    values.collateralDeltaUsd =
      leverageWithoutPnl !== undefined && !leverageWithoutPnl.isZero()
        ? remainingCollateralUsd.sub(
            nextSizeInUsd.mul(ONE_USD).div(leverageWithoutPnl)
          )
        : BN_ZERO;
    values.collateralDeltaAmount =
      convertUsdToTokenAmount(
        values.collateralDeltaUsd,
        collateralToken.decimals,
        values.collateralPrice
      ) ?? BN_ZERO;
    values.receiveTokenAmount = payedInfo.outputAmount.add(
      values.collateralDeltaAmount
    );
  } else {
    values.collateralDeltaUsd = BN_ZERO;
    values.collateralDeltaAmount = BN_ZERO;
    values.receiveTokenAmount = payedInfo.outputAmount;
  }

  values.receiveUsd = convertTokenAmountToUsd(
    values.receiveTokenAmount,
    collateralToken.decimals,
    values.collateralPrice
  )!;

  return values;
}

function getIsFullClose(p: {
  position: PositionInfo;
  sizeDeltaUsd: BN;
  indexPrice: BN;
  remainingCollateralUsd: BN;
  minCollateralUsd: BN;
  minPositionSizeUsd: BN;
}) {
  const {
    position,
    sizeDeltaUsd,
    indexPrice,
    remainingCollateralUsd,
    minCollateralUsd,
    minPositionSizeUsd,
  } = p;
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

  const realizedPnl = position.sizeInUsd.gt(BN_ZERO)
    ? estimatedPnl.mul(sizeDeltaUsd).div(position.sizeInUsd)
    : BN_ZERO;

  const estimatedRemainingPnl = estimatedPnl.sub(realizedPnl);

  if (realizedPnl.lt(BN_ZERO)) {
    const estimatedRemainingCollateralUsd =
      remainingCollateralUsd.sub(realizedPnl);

    let minCollateralFactor = isLong
      ? marketInfo.minCollateralFactorForOpenInterestMultiplierForLong
      : marketInfo.minCollateralFactorForOpenInterestMultiplierForShort;

    const minCollateralFactorForMarket = marketInfo.minCollateralFactor;

    if (minCollateralFactorForMarket.gt(minCollateralFactor)) {
      minCollateralFactor = minCollateralFactorForMarket;
    }

    const minCollateralUsdForLeverage = applyFactor(
      position.sizeInUsd,
      minCollateralFactor
    );
    const willCollateralBeSufficient = estimatedRemainingCollateralUsd.gte(
      minCollateralUsdForLeverage
    );

    if (!willCollateralBeSufficient) {
      if (
        estimatedRemainingCollateralUsd
          .add(estimatedRemainingPnl)
          .lt(minCollateralUsd) ||
        position.sizeInUsd.sub(sizeDeltaUsd).lt(minPositionSizeUsd)
      ) {
        return true;
      }
    }
  }

  return false;
}

function payForCollateralCost(p: {
  initialCostUsd: BN;
  collateralToken: TokenData;
  collateralPrice: BN;
  outputAmount: BN;
  remainingCollateralAmount: BN;
}) {
  const {
    initialCostUsd,
    collateralToken,
    collateralPrice,
    outputAmount,
    remainingCollateralAmount,
  } = p;

  const values = {
    outputAmount,
    remainingCollateralAmount,
    paidOutputAmount: BN_ZERO,
    paidRemainingCollateralAmount: BN_ZERO,
  };

  let remainingCostAmount =
    convertUsdToTokenAmount(
      initialCostUsd,
      collateralToken.decimals,
      collateralPrice
    ) ?? BN_ZERO;

  if (remainingCostAmount.isZero()) {
    return values;
  }

  if (values.outputAmount.gt(BN_ZERO)) {
    if (values.outputAmount.gt(remainingCostAmount)) {
      values.outputAmount = values.outputAmount.sub(remainingCostAmount);
      values.paidOutputAmount = remainingCostAmount;
      remainingCostAmount = BN_ZERO;
    } else {
      remainingCostAmount = remainingCostAmount.sub(values.outputAmount);
      values.paidOutputAmount = values.outputAmount;
      values.outputAmount = BN_ZERO;
    }
  }

  if (remainingCostAmount.isZero()) {
    return values;
  }

  if (values.remainingCollateralAmount.gt(remainingCostAmount)) {
    values.remainingCollateralAmount =
      values.remainingCollateralAmount.sub(remainingCostAmount);
    values.paidRemainingCollateralAmount = remainingCostAmount;
    remainingCostAmount = BN_ZERO;
  } else {
    remainingCostAmount = remainingCostAmount.sub(
      values.remainingCollateralAmount
    );
    values.paidRemainingCollateralAmount = values.remainingCollateralAmount;
    values.remainingCollateralAmount = BN_ZERO;
  }

  return values;
}

function applyAcceptablePrice(p: {
  marketInfo: MarketInfo;
  isLong: boolean;
  isTrigger: boolean;
  fixedAcceptablePriceImpactBps?: number;
  acceptablePriceImpactBuffer?: number;
  values: DecreasePositionAmounts;
}) {
  const {
    marketInfo,
    isLong,
    values,
    isTrigger,
    fixedAcceptablePriceImpactBps,
    acceptablePriceImpactBuffer,
  } = p;

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
        values.acceptablePrice = BN_ZERO;
      } else {
        values.acceptablePrice = MAX_SIGNED_USD;
      }
    } else {
      let maxNegativePriceImpactBps = fixedAcceptablePriceImpactBps;
      values.recommendedAcceptablePriceDeltaBps =
        getAcceptablePriceImpactBpsDefault({
          isIncrease: false,
          isLong,
          indexPrice: values.indexPrice,
          sizeDeltaUsd: values.sizeDeltaUsd,
          priceImpactDeltaUsd: values.positionPriceImpactDeltaUsd,
          acceptablePriceImapctBuffer:
            acceptablePriceImpactBuffer ||
            DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER,
        });

      if (maxNegativePriceImpactBps === undefined) {
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
      values.acceptablePriceDeltaBps =
        triggerAcceptablePriceInfo.acceptablePriceDeltaBps;
    }
  }

  return values;
}

function estimateCollateralCost(
  baseUsd: BN,
  collateralToken: TokenData,
  collateralPrice: BN
) {
  const amount =
    convertUsdToTokenAmount(
      baseUsd,
      collateralToken.decimals,
      collateralToken.prices.minPrice
    ) ?? BN_ZERO;
  const usd = convertTokenAmountToUsd(
    amount,
    collateralToken.decimals,
    collateralPrice
  );

  return {
    amount,
    usd,
  };
}
