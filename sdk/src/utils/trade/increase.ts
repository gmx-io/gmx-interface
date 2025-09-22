import { maxUint256 } from "viem";

import { BASIS_POINTS_DIVISOR_BIGINT, DEFAULT_ACCEPTABLE_PRICE_IMPACT_BUFFER } from "configs/factors";
import { MarketInfo, MarketsInfoData } from "types/markets";
import { OrderType } from "types/orders";
import { PositionInfo } from "types/positions";
import { UserReferralInfo } from "types/referrals";
import { ExternalSwapStrategy, NoSwapStrategy } from "types/swapStrategy";
import { TokenData, TokensRatio } from "types/tokens";
import {
  ExternalSwapQuote,
  ExternalSwapQuoteParams,
  FindSwapPath,
  IncreasePositionAmounts,
  NextPositionValues,
  SwapOptimizationOrderArray,
  TriggerThresholdType,
} from "types/trade";
import { bigMath } from "utils/bigmath";
import {
  capPositionImpactUsdByMaxImpactPool,
  capPositionImpactUsdByMaxPriceImpactFactor,
  getPositionFee,
  getPriceImpactForPosition,
  getTotalSwapVolumeFromSwapStats,
} from "utils/fees";
import { applyFactor } from "utils/numbers";
import {
  getEntryPrice,
  getLeverage,
  getLiquidationPrice,
  getPositionPnlUsd,
  getPriceImpactDiffUsd,
} from "utils/positions";
import {
  getAcceptablePriceInfo,
  getDefaultAcceptablePriceImpactBps,
  getMarkPrice,
  getOrderThresholdType,
} from "utils/prices";
import { getSwapAmountsByFromValue, getSwapAmountsByToValue } from "utils/swap";
import { convertToTokenAmount, convertToUsd, getIsEquivalentTokens, getTokensRatioByPrice } from "utils/tokens";

type IncreasePositionParams = {
  marketInfo: MarketInfo;
  indexToken: TokenData;
  initialCollateralToken: TokenData;
  collateralToken: TokenData;
  isLong: boolean;
  initialCollateralAmount: bigint | undefined;
  position: PositionInfo | undefined;
  externalSwapQuote: ExternalSwapQuote | undefined;
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
  marketsInfoData: MarketsInfoData | undefined;
  chainId: number;
  externalSwapQuoteParams: ExternalSwapQuoteParams | undefined;
};

export function getIncreasePositionAmounts(p: IncreasePositionParams): IncreasePositionAmounts {
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
    externalSwapQuote,
    findSwapPath,
    userReferralInfo,
    uiFeeFactor,
    strategy,
    marketsInfoData,
    chainId,
    externalSwapQuoteParams,
  } = p;

  const swapStrategy: NoSwapStrategy = {
    type: "noSwap",
    externalSwapQuote: undefined,
    swapPathStats: undefined,
    amountIn: 0n,
    amountOut: 0n,
    usdIn: 0n,
    usdOut: 0n,
    priceIn: 0n,
    priceOut: 0n,
    feesUsd: 0n,
  };

  const values: IncreasePositionAmounts = {
    initialCollateralAmount: 0n,
    initialCollateralUsd: 0n,

    collateralDeltaAmount: 0n,
    collateralDeltaUsd: 0n,

    swapStrategy,

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
    recommendedAcceptablePriceDeltaBps: 0n,

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

  const swapOptimizationOrder: SwapOptimizationOrderArray | undefined = isLimit ? ["length", "liquidity"] : undefined;

  const prices = getIncreasePositionPrices({
    triggerPrice,
    indexToken,
    initialCollateralToken,
    collateralToken,
    limitOrderType,
    isLong,
  });

  values.indexPrice = prices.indexPrice;
  values.initialCollateralPrice = prices.initialCollateralPrice;
  values.collateralPrice = prices.collateralPrice;
  values.triggerPrice = prices.triggerPrice;
  values.triggerThresholdType = prices.triggerThresholdType;

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

    if (externalSwapQuote) {
      const swapStrategy: ExternalSwapStrategy = {
        type: "externalSwap",
        externalSwapQuote,
        swapPathStats: undefined,
        ...externalSwapQuote,
      };

      values.swapStrategy = swapStrategy;
    } else {
      const swapAmounts = getSwapAmountsByFromValue({
        tokenIn: initialCollateralToken,
        tokenOut: collateralToken,
        amountIn: initialCollateralAmount,
        isLimit: false,
        findSwapPath,
        uiFeeFactor,
        swapOptimizationOrder,
        marketsInfoData,
        chainId,
        externalSwapQuoteParams,
      });

      values.swapStrategy = swapAmounts.swapStrategy;
    }

    const swapAmountOut = values.swapStrategy.amountOut;
    const baseCollateralUsd = convertToUsd(swapAmountOut, collateralToken.decimals, values.collateralPrice)!;
    const baseSizeDeltaUsd = bigMath.mulDiv(baseCollateralUsd, leverage, BASIS_POINTS_DIVISOR_BIGINT);
    const { balanceWasImproved } = getPriceImpactForPosition(marketInfo, baseSizeDeltaUsd, isLong);
    const basePositionFeeInfo = getPositionFee(marketInfo, baseSizeDeltaUsd, balanceWasImproved, userReferralInfo);
    const baseUiFeeUsd = applyFactor(baseSizeDeltaUsd, uiFeeFactor);
    const totalSwapVolumeUsd = getTotalSwapVolumeFromSwapStats(values.swapStrategy.swapPathStats?.swapSteps);
    values.swapUiFeeUsd = applyFactor(totalSwapVolumeUsd, uiFeeFactor);

    values.sizeDeltaUsd = bigMath.mulDiv(
      baseCollateralUsd - basePositionFeeInfo.positionFeeUsd - baseUiFeeUsd - values.swapUiFeeUsd,
      leverage,
      BASIS_POINTS_DIVISOR_BIGINT
    );

    values.indexTokenAmount = convertToTokenAmount(values.sizeDeltaUsd, indexToken.decimals, values.indexPrice)!;

    const positionFeeInfo = getPositionFee(marketInfo, values.sizeDeltaUsd, balanceWasImproved, userReferralInfo);
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

    const { balanceWasImproved } = getPriceImpactForPosition(marketInfo, values.sizeDeltaUsd, isLong);

    const positionFeeInfo = getPositionFee(marketInfo, values.sizeDeltaUsd, balanceWasImproved, userReferralInfo);

    values.positionFeeUsd = positionFeeInfo.positionFeeUsd;
    values.feeDiscountUsd = positionFeeInfo.discountUsd;
    values.uiFeeUsd = applyFactor(values.sizeDeltaUsd, uiFeeFactor);

    const { collateralDeltaUsd, collateralDeltaAmount, baseCollateralAmount } = leverageBySizeValues({
      collateralToken,
      leverage,
      sizeDeltaUsd: values.sizeDeltaUsd,
      collateralPrice: values.collateralPrice,
      uiFeeFactor,
      positionFeeUsd: values.positionFeeUsd,
      borrowingFeeUsd: values.borrowingFeeUsd,
      fundingFeeUsd: values.fundingFeeUsd,
      uiFeeUsd: values.uiFeeUsd,
      swapUiFeeUsd: values.swapUiFeeUsd,
    });

    values.collateralDeltaUsd = collateralDeltaUsd;
    values.collateralDeltaAmount = collateralDeltaAmount;

    if (externalSwapQuote) {
      const swapStrategy: ExternalSwapStrategy = {
        type: "externalSwap",
        externalSwapQuote,
        swapPathStats: undefined,
        ...externalSwapQuote,
      };

      values.swapStrategy = swapStrategy;
    } else {
      const swapAmounts = getSwapAmountsByToValue({
        tokenIn: initialCollateralToken,
        tokenOut: collateralToken,
        amountOut: baseCollateralAmount,
        isLimit: false,
        findSwapPath,
        uiFeeFactor,
        marketsInfoData,
        chainId,
        externalSwapQuoteParams,
      });
      values.swapStrategy = swapAmounts.swapStrategy;
    }

    const swapAmountIn = values.swapStrategy.amountIn;

    values.initialCollateralAmount = swapAmountIn;
    values.initialCollateralUsd = convertToUsd(
      values.initialCollateralAmount,
      initialCollateralToken.decimals,
      values.initialCollateralPrice
    )!;
  } else if (strategy === "independent") {
    if (indexTokenAmount !== undefined && indexTokenAmount > 0) {
      values.indexTokenAmount = indexTokenAmount;
      values.sizeDeltaUsd = convertToUsd(indexTokenAmount, indexToken.decimals, values.indexPrice)!;

      const { balanceWasImproved } = getPriceImpactForPosition(marketInfo, values.sizeDeltaUsd, isLong);

      const positionFeeInfo = getPositionFee(marketInfo, values.sizeDeltaUsd, balanceWasImproved, userReferralInfo);
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

      if (externalSwapQuote) {
        const swapStrategy: ExternalSwapStrategy = {
          type: "externalSwap",
          externalSwapQuote,
          swapPathStats: undefined,
          ...externalSwapQuote,
        };

        values.swapStrategy = swapStrategy;
      } else {
        const swapAmounts = getSwapAmountsByFromValue({
          tokenIn: initialCollateralToken,
          tokenOut: collateralToken,
          amountIn: initialCollateralAmount,
          isLimit: false,
          findSwapPath,
          uiFeeFactor,
          swapOptimizationOrder,
          marketsInfoData,
          chainId,
          externalSwapQuoteParams,
        });
        values.swapStrategy = swapAmounts.swapStrategy;
      }

      const swapAmountIn = values.swapStrategy.amountIn;
      const baseCollateralUsd = convertToUsd(
        swapAmountIn,
        initialCollateralToken.decimals,
        values.initialCollateralPrice
      )!;

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
    isLimit,
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
      values.recommendedAcceptablePriceDeltaBps = getDefaultAcceptablePriceImpactBps({
        isIncrease: true,
        isLong,
        indexPrice: values.indexPrice,
        sizeDeltaUsd: values.sizeDeltaUsd,
        priceImpactDeltaUsd: values.positionPriceImpactDeltaUsd,
        acceptablePriceImapctBuffer: acceptablePriceImpactBuffer || DEFAULT_ACCEPTABLE_PRICE_IMPACT_BUFFER,
      });

      if (maxNegativePriceImpactBps === undefined) {
        maxNegativePriceImpactBps = values.recommendedAcceptablePriceDeltaBps;
      }

      const limitAcceptablePriceInfo = getAcceptablePriceInfo({
        marketInfo,
        isIncrease: true,
        isLimit,
        isLong,
        indexPrice: values.indexPrice,
        sizeDeltaUsd: values.sizeDeltaUsd,
        maxNegativePriceImpactBps,
      });

      values.acceptablePrice = limitAcceptablePriceInfo.acceptablePrice;
      values.acceptablePriceDeltaBps = limitAcceptablePriceInfo.acceptablePriceDeltaBps;
    }
  }

  values.sizeDeltaInTokens = convertToTokenAmount(values.sizeDeltaUsd, indexToken.decimals, values.indexPrice)!;

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

export function leverageBySizeValues({
  collateralToken,
  leverage,
  sizeDeltaUsd,
  collateralPrice,
  positionFeeUsd,
  borrowingFeeUsd,
  uiFeeUsd,
  swapUiFeeUsd,
  fundingFeeUsd,
}: {
  collateralToken: TokenData;
  leverage: bigint;
  sizeDeltaUsd: bigint;
  collateralPrice: bigint;
  uiFeeFactor: bigint;
  positionFeeUsd: bigint;
  fundingFeeUsd: bigint;
  borrowingFeeUsd: bigint;
  uiFeeUsd: bigint;
  swapUiFeeUsd: bigint;
}) {
  const collateralDeltaUsd = bigMath.mulDiv(sizeDeltaUsd, BASIS_POINTS_DIVISOR_BIGINT, leverage);
  const collateralDeltaAmount = convertToTokenAmount(collateralDeltaUsd, collateralToken.decimals, collateralPrice)!;

  const baseCollateralUsd =
    collateralDeltaUsd !== 0n
      ? collateralDeltaUsd + positionFeeUsd + borrowingFeeUsd + fundingFeeUsd + uiFeeUsd + swapUiFeeUsd
      : 0n;

  const baseCollateralAmount = convertToTokenAmount(baseCollateralUsd, collateralToken.decimals, collateralPrice)!;

  return {
    collateralDeltaUsd,
    collateralDeltaAmount,
    baseCollateralUsd,
    baseCollateralAmount,
  };
}

export function getIncreasePositionPrices({
  triggerPrice,
  indexToken,
  initialCollateralToken,
  collateralToken,
  limitOrderType,
  isLong,
}: {
  triggerPrice?: bigint;
  indexToken: TokenData;
  initialCollateralToken: TokenData;
  collateralToken: TokenData;
  isLong: boolean;
  limitOrderType?: IncreasePositionAmounts["limitOrderType"];
}) {
  let indexPrice: bigint;
  let initialCollateralPrice: bigint;
  let triggerThresholdType: TriggerThresholdType | undefined;
  let collateralPrice: bigint;

  if (triggerPrice !== undefined && triggerPrice > 0 && limitOrderType !== undefined) {
    indexPrice = triggerPrice;
    initialCollateralPrice = getIsEquivalentTokens(indexToken, initialCollateralToken)
      ? triggerPrice
      : initialCollateralToken.prices.minPrice;

    collateralPrice = getIsEquivalentTokens(indexToken, collateralToken)
      ? triggerPrice
      : collateralToken.prices.minPrice;

    triggerThresholdType = getOrderThresholdType(limitOrderType, isLong);
  } else {
    indexPrice = getMarkPrice({ prices: indexToken.prices, isIncrease: true, isLong });
    initialCollateralPrice = initialCollateralToken.prices.minPrice;
    collateralPrice = collateralToken.prices.minPrice;
  }

  return {
    indexPrice,
    initialCollateralPrice,
    collateralPrice,
    triggerThresholdType,
    triggerPrice,
  };
}

export function getNextPositionValuesForIncreaseTrade(p: {
  existingPosition?: PositionInfo;
  marketInfo: MarketInfo;
  collateralToken: TokenData;
  positionPriceImpactDeltaUsd: bigint;
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
    positionPriceImpactDeltaUsd,
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
    pendingImpactAmount: existingPosition?.pendingImpactAmount ?? 0n,
    isLong: isLong,
    userReferralInfo,
  });

  let nextPendingImpactDeltaUsd =
    existingPosition?.pendingImpactUsd !== undefined
      ? existingPosition.pendingImpactUsd + positionPriceImpactDeltaUsd
      : positionPriceImpactDeltaUsd;

  const potentialPriceImpactDiffUsd = getPriceImpactDiffUsd({
    totalImpactDeltaUsd: nextPendingImpactDeltaUsd,
    marketInfo,
    sizeDeltaUsd: nextSizeUsd,
  });

  if (nextPendingImpactDeltaUsd > 0) {
    nextPendingImpactDeltaUsd = capPositionImpactUsdByMaxPriceImpactFactor(
      marketInfo,
      nextSizeUsd,
      nextPendingImpactDeltaUsd
    );
  }

  nextPendingImpactDeltaUsd = capPositionImpactUsdByMaxImpactPool(marketInfo, nextPendingImpactDeltaUsd);

  return {
    nextSizeUsd,
    nextCollateralUsd,
    nextEntryPrice,
    nextLeverage,
    nextLiqPrice,
    nextPendingImpactDeltaUsd,
    potentialPriceImpactDiffUsd,
  };
}
