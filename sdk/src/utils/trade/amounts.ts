import { FindSwapPath } from "types/trade";

import { TokenData, TokensRatio } from "types/tokens";

import { MarketInfo } from "types/markets";
import { PositionInfo } from "types/positions";
import { IncreasePositionAmounts } from "types/trade";
import { UserReferralInfo } from "types/referrals";
import { convertToTokenAmount, convertToUsd, getIsEquivalentTokens, getTokensRatioByPrice } from "utils/tokens";
import {
  getAcceptablePriceInfo,
  getDefaultAcceptablePriceImpactBps,
  getMarkPrice,
  getOrderThresholdType,
} from "utils/prices";
import { getPositionFee } from "utils/fees";
import { bigMath } from "utils/bigmath";
import { getTotalSwapVolumeFromSwapStats } from "utils/fees";
import { getSwapAmountsByFromValue, getSwapAmountsByToValue } from "utils/swap";
import { getPriceImpactForPosition } from "utils/fees";
import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";
import { applyFactor } from "utils/numbers";
import { getLeverage } from "utils/positions";
import { OrderType } from "types/orders";
import { maxUint256 } from "viem";

interface IncreasePositionAmountsParams {
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
  limitOrderType?: IncreasePositionAmounts["limitOrderType"];
  fixedAcceptablePriceImpactBps?: bigint;
  acceptablePriceImpactBuffer?: number;
  userReferralInfo: UserReferralInfo | undefined;
  strategy: "leverageBySize" | "leverageByCollateral" | "independent";
  findSwapPath: FindSwapPath;
  uiFeeFactor: bigint;
}

export function getIncreasePositionAmounts(p: IncreasePositionAmountsParams): IncreasePositionAmounts {
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
    limitOrderType,
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

    limitOrderType: limitOrderType,
    triggerThresholdType: undefined,
  };

  const isLimit = limitOrderType !== undefined;

  const swapOptimizationOrder: Parameters<FindSwapPath>[1]["order"] = isLimit ? ["length", "liquidity"] : undefined;

  if (isLimit && triggerPrice !== undefined) {
    values.triggerPrice = triggerPrice;
    values.triggerThresholdType = getOrderThresholdType(limitOrderType, isLong);

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
      swapOptimizationOrder,
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
        swapOptimizationOrder,
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
    if (limitOrderType === OrderType.StopIncrease) {
      if (isLong) {
        values.acceptablePrice = maxUint256;
      } else {
        values.acceptablePrice = 0n;
      }
    } else {
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

export function getTokensRatio({
  fromToken,
  toToken,
  triggerRatioValue,
  markPrice,
}: {
  fromToken: TokenData;
  toToken: TokenData;
  triggerRatioValue: bigint;
  markPrice: bigint;
}) {
  const fromTokenPrice = fromToken?.prices.minPrice;

  const markRatio = getTokensRatioByPrice({
    fromToken,
    toToken,
    fromPrice: fromTokenPrice,
    toPrice: markPrice,
  });

  if (triggerRatioValue === undefined) {
    return { markRatio };
  }

  const triggerRatio: TokensRatio = {
    ratio: triggerRatioValue > 0 ? triggerRatioValue : markRatio.ratio,
    largestToken: markRatio.largestToken,
    smallestToken: markRatio.smallestToken,
  };

  return {
    markRatio,
    triggerRatio,
  };
}
