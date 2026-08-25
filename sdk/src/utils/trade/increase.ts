import { maxUint256 } from "viem";

import { BASIS_POINTS_DIVISOR_BIGINT, DEFAULT_ACCEPTABLE_PRICE_IMPACT_BUFFER } from "configs/factors";
import { getWrappedToken } from "configs/tokens";
import { bigMath } from "utils/bigmath";
import {
  capPositionImpactUsdByMaxImpactPool,
  capPositionImpactUsdByMaxPriceImpactFactor,
  getPositionFee,
  getPriceImpactForPosition,
  getTotalSwapVolumeFromSwapStats,
} from "utils/fees";
import { MarketInfo, MarketsInfoData } from "utils/markets/types";
import { applyFactor } from "utils/numbers";
import { OrderType, SwapPricingType } from "utils/orders/types";
import {
  getEntryPrice,
  getLeverage,
  getLiquidationPrice,
  getPositionPnlUsd,
  getPriceImpactDiffUsd,
} from "utils/positions";
import { PositionInfo } from "utils/positions/types";
import {
  getAcceptablePriceInfo,
  getDefaultAcceptablePriceImpactBps,
  getMarkPrice,
  getOrderThresholdType,
} from "utils/prices";
import { UserReferralInfo } from "utils/referrals/types";
import { getSwapAmountsByFromValue, getSwapAmountsByToValue, getSwapPathStats } from "utils/swap";
import { ExternalSwapStrategy, NoSwapStrategy, SwapStrategyForIncreaseOrders } from "utils/swap/types";
import {
  convertToTokenAmount,
  convertToTokenAmountForIncrease,
  convertToUsd,
  getIsEquivalentTokens,
  getTokensRatioByPrice,
} from "utils/tokens";
import { TokenData, TokensRatio } from "utils/tokens/types";

import {
  ExternalSwapQuote,
  ExternalSwapQuoteParams,
  FindSwapPath,
  IncreasePositionAmounts,
  NextPositionValues,
  SwapOptimizationOrderArray,
  SwapPathStats,
  TriggerThresholdType,
} from "./types";

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
  proDiscountFactor?: bigint;
  strategy: "leverageBySize" | "leverageByCollateral" | "independent";
  findSwapPath: FindSwapPath;
  uiFeeFactor: bigint;
  marketsInfoData: MarketsInfoData | undefined;
  chainId: number;
  externalSwapQuoteParams: ExternalSwapQuoteParams | undefined;
  isSetAcceptablePriceImpactEnabled: boolean;
  disabledMarkets?: string[];
  manualPath?: string[];
};

function getBaseCollateralUsdFromSwapStrategy({
  swapStrategy,
  initialCollateralToken,
  collateralToken,
  collateralPrice,
  swapPathStatsAtEvaluationPrice,
}: {
  swapStrategy: SwapStrategyForIncreaseOrders;
  initialCollateralToken: TokenData;
  collateralToken: TokenData;
  collateralPrice: bigint;
  swapPathStatsAtEvaluationPrice: SwapPathStats | undefined;
}): bigint {
  if (swapStrategy.type === "noSwap" && getIsEquivalentTokens(initialCollateralToken, collateralToken)) {
    return convertToUsd(swapStrategy.amountIn, initialCollateralToken.decimals, collateralPrice)!;
  }

  const grossAmountOut =
    swapPathStatsAtEvaluationPrice?.amountOut ?? swapStrategy.swapPathStats?.amountOut ?? swapStrategy.amountOut;

  return convertToUsd(grossAmountOut, collateralToken.decimals, collateralPrice)!;
}

function getSwapPathStatsAtEvaluationPrice({
  swapStrategy,
  marketsInfoData,
  indexToken,
  initialCollateralToken,
  evaluationPrice,
  chainId,
}: {
  swapStrategy: SwapStrategyForIncreaseOrders;
  marketsInfoData: MarketsInfoData | undefined;
  indexToken: TokenData;
  initialCollateralToken: TokenData;
  evaluationPrice: bigint | undefined;
  chainId: number;
}): SwapPathStats | undefined {
  if (evaluationPrice === undefined || swapStrategy.type !== "internalSwap" || !marketsInfoData) {
    return undefined;
  }

  const { swapPath, tokenInAddress } = swapStrategy.swapPathStats;
  let hasRepricedToken = false;

  const withEvaluationPrice = <T extends TokenData>(token: T): T => {
    if (!getIsEquivalentTokens(token, indexToken)) {
      return token;
    }

    hasRepricedToken = true;

    return { ...token, prices: { minPrice: evaluationPrice, maxPrice: evaluationPrice } };
  };

  const repricedMarketsInfoData: MarketsInfoData = { ...marketsInfoData };

  for (const marketAddress of swapPath) {
    const marketInfo = marketsInfoData[marketAddress];

    if (!marketInfo) {
      return undefined;
    }

    repricedMarketsInfoData[marketAddress] = {
      ...marketInfo,
      indexToken: withEvaluationPrice(marketInfo.indexToken),
      longToken: withEvaluationPrice(marketInfo.longToken),
      shortToken: withEvaluationPrice(marketInfo.shortToken),
    };
  }

  const priceIn = getIsEquivalentTokens(initialCollateralToken, indexToken)
    ? evaluationPrice
    : initialCollateralToken.prices.minPrice;

  if (!hasRepricedToken && priceIn === initialCollateralToken.prices.minPrice) {
    return undefined;
  }

  return getSwapPathStats({
    marketsInfoData: repricedMarketsInfoData,
    swapPath,
    initialCollateralAddress: tokenInAddress,
    wrappedNativeTokenAddress: getWrappedToken(chainId).address,
    usdIn: convertToUsd(swapStrategy.amountIn, initialCollateralToken.decimals, priceIn)!,
    shouldUnwrapNativeToken: false,
    shouldApplyPriceImpact: true,
    swapPricingType: SwapPricingType.Swap,
  });
}

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
    proDiscountFactor,
    uiFeeFactor,
    strategy,
    marketsInfoData,
    chainId,
    externalSwapQuoteParams,
    isSetAcceptablePriceImpactEnabled,
    disabledMarkets,
    manualPath,
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
    potentialPriceImpactDiffUsd: 0n,

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

  const evaluationPrice = prices.evaluationPrice;

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
        allowSameTokenSwap: false,
        disabledMarkets,
        manualPath,
      });

      values.swapStrategy = swapAmounts.swapStrategy;
    }

    const swapPathStatsAtEvaluationPrice = getSwapPathStatsAtEvaluationPrice({
      swapStrategy: values.swapStrategy,
      marketsInfoData,
      indexToken,
      initialCollateralToken,
      evaluationPrice,
      chainId,
    });
    const baseCollateralUsd = getBaseCollateralUsdFromSwapStrategy({
      swapStrategy: values.swapStrategy,
      initialCollateralToken,
      collateralToken,
      collateralPrice: values.collateralPrice,
      swapPathStatsAtEvaluationPrice,
    });
    const baseSizeDeltaUsd = bigMath.mulDiv(baseCollateralUsd, leverage, BASIS_POINTS_DIVISOR_BIGINT);
    const baseSizeDeltaInTokens = convertToTokenAmountForIncrease(
      baseSizeDeltaUsd,
      indexToken.decimals,
      values.indexPrice,
      isLong
    )!;
    const { balanceWasImproved: baseBalanceWasImproved } = getPriceImpactForPosition(
      marketInfo,
      baseSizeDeltaUsd,
      isLong,
      { sizeDeltaInTokens: baseSizeDeltaInTokens }
    );
    const basePositionFeeInfo = getPositionFee(
      marketInfo,
      baseSizeDeltaUsd,
      baseBalanceWasImproved,
      userReferralInfo,
      undefined,
      proDiscountFactor
    );
    const baseUiFeeUsd = applyFactor(baseSizeDeltaUsd, uiFeeFactor);
    const totalSwapVolumeUsd = getTotalSwapVolumeFromSwapStats(
      (swapPathStatsAtEvaluationPrice ?? values.swapStrategy.swapPathStats)?.swapSteps
    );
    values.swapUiFeeUsd = applyFactor(totalSwapVolumeUsd, uiFeeFactor);

    values.sizeDeltaUsd = bigMath.mulDiv(
      baseCollateralUsd - basePositionFeeInfo.positionFeeUsd - baseUiFeeUsd - values.swapUiFeeUsd,
      leverage,
      BASIS_POINTS_DIVISOR_BIGINT
    );

    if (values.sizeDeltaUsd <= 0n) {
      return values;
    }

    values.indexTokenAmount = convertToTokenAmountForIncrease(
      values.sizeDeltaUsd,
      indexToken.decimals,
      values.indexPrice,
      isLong
    )!;

    const { balanceWasImproved } = getPriceImpactForPosition(marketInfo, values.sizeDeltaUsd, isLong, {
      sizeDeltaInTokens: values.indexTokenAmount,
    });
    const positionFeeInfo = getPositionFee(
      marketInfo,
      values.sizeDeltaUsd,
      balanceWasImproved,
      userReferralInfo,
      undefined,
      proDiscountFactor
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

    const sizeDeltaInTokensForPriceImpact = convertToTokenAmountForIncrease(
      values.sizeDeltaUsd,
      indexToken.decimals,
      values.indexPrice,
      isLong
    )!;
    const { balanceWasImproved } = getPriceImpactForPosition(marketInfo, values.sizeDeltaUsd, isLong, {
      sizeDeltaInTokens: sizeDeltaInTokensForPriceImpact,
    });

    const positionFeeInfo = getPositionFee(
      marketInfo,
      values.sizeDeltaUsd,
      balanceWasImproved,
      userReferralInfo,
      undefined,
      proDiscountFactor
    );

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
        allowSameTokenSwap: false,
        disabledMarkets,
        manualPath,
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

    const swapPathStatsAtEvaluationPrice = getSwapPathStatsAtEvaluationPrice({
      swapStrategy: values.swapStrategy,
      marketsInfoData,
      indexToken,
      initialCollateralToken,
      evaluationPrice,
      chainId,
    });

    if (swapPathStatsAtEvaluationPrice) {
      const baseCollateralUsdAtEvaluationPrice = convertToUsd(
        swapPathStatsAtEvaluationPrice.amountOut,
        collateralToken.decimals,
        values.collateralPrice
      )!;
      const swapUiFeeUsdAtEvaluationPrice = applyFactor(
        getTotalSwapVolumeFromSwapStats(swapPathStatsAtEvaluationPrice.swapSteps),
        uiFeeFactor
      );

      values.collateralDeltaUsd =
        baseCollateralUsdAtEvaluationPrice -
        values.positionFeeUsd -
        values.borrowingFeeUsd -
        values.fundingFeeUsd -
        values.uiFeeUsd -
        swapUiFeeUsdAtEvaluationPrice;
      values.collateralDeltaAmount = convertToTokenAmount(
        values.collateralDeltaUsd,
        collateralToken.decimals,
        values.collateralPrice
      )!;
    }
  } else if (strategy === "independent") {
    if (indexTokenAmount !== undefined && indexTokenAmount > 0) {
      values.indexTokenAmount = indexTokenAmount;
      values.sizeDeltaUsd = convertToUsd(indexTokenAmount, indexToken.decimals, values.indexPrice)!;

      const sizeDeltaInTokensForPriceImpact = convertToTokenAmountForIncrease(
        values.sizeDeltaUsd,
        indexToken.decimals,
        values.indexPrice,
        isLong
      )!;
      const { balanceWasImproved } = getPriceImpactForPosition(marketInfo, values.sizeDeltaUsd, isLong, {
        sizeDeltaInTokens: sizeDeltaInTokensForPriceImpact,
      });

      const positionFeeInfo = getPositionFee(
        marketInfo,
        values.sizeDeltaUsd,
        balanceWasImproved,
        userReferralInfo,
        undefined,
        proDiscountFactor
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
          allowSameTokenSwap: false,
          disabledMarkets,
          manualPath,
        });
        values.swapStrategy = swapAmounts.swapStrategy;
      }

      const swapPathStatsAtEvaluationPrice = getSwapPathStatsAtEvaluationPrice({
        swapStrategy: values.swapStrategy,
        marketsInfoData,
        indexToken,
        initialCollateralToken,
        evaluationPrice,
        chainId,
      });
      const baseCollateralUsd = getBaseCollateralUsdFromSwapStrategy({
        swapStrategy: values.swapStrategy,
        initialCollateralToken,
        collateralToken,
        collateralPrice: values.collateralPrice,
        swapPathStatsAtEvaluationPrice,
      });
      const totalSwapVolumeUsd = getTotalSwapVolumeFromSwapStats(
        (swapPathStatsAtEvaluationPrice ?? values.swapStrategy.swapPathStats)?.swapSteps
      );
      values.swapUiFeeUsd = applyFactor(totalSwapVolumeUsd, uiFeeFactor);

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

  values.sizeDeltaInTokens = convertToTokenAmountForIncrease(
    values.sizeDeltaUsd,
    indexToken.decimals,
    values.indexPrice,
    isLong
  )!;

  const acceptablePriceInfo = getAcceptablePriceInfo({
    marketInfo,
    isIncrease: true,
    isLimit,
    isLong,
    indexPrice: values.indexPrice,
    sizeDeltaUsd: values.sizeDeltaUsd,
    sizeDeltaInTokens: values.sizeDeltaInTokens,
  });

  values.positionPriceImpactDeltaUsd = acceptablePriceInfo.priceImpactDeltaUsd;
  values.potentialPriceImpactDiffUsd = getPriceImpactDiffUsd({
    totalImpactDeltaUsd: values.positionPriceImpactDeltaUsd,
    marketInfo,
    sizeDeltaUsd: values.sizeDeltaUsd,
  });

  values.acceptablePrice = acceptablePriceInfo.acceptablePrice;
  values.acceptablePriceDeltaBps = acceptablePriceInfo.acceptablePriceDeltaBps;

  if (isLimit) {
    if (!isSetAcceptablePriceImpactEnabled || limitOrderType === OrderType.StopIncrease) {
      values.acceptablePrice = isLong ? maxUint256 : 0n;
    } else {
      let maxNegativePriceImpactBps = fixedAcceptablePriceImpactBps;
      values.recommendedAcceptablePriceDeltaBps = getDefaultAcceptablePriceImpactBps({
        isIncrease: true,
        isLong,
        indexPrice: values.indexPrice,
        sizeDeltaUsd: values.sizeDeltaUsd,
        priceImpactDeltaUsd: values.positionPriceImpactDeltaUsd,
        acceptablePriceImpactBuffer: acceptablePriceImpactBuffer || DEFAULT_ACCEPTABLE_PRICE_IMPACT_BUFFER,
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
        sizeDeltaInTokens: values.sizeDeltaInTokens,
      });

      values.acceptablePrice = limitAcceptablePriceInfo.acceptablePrice;
      values.acceptablePriceDeltaBps = limitAcceptablePriceInfo.acceptablePriceDeltaBps;
    }
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
  const collateralDeltaUsd = leverage > 0n ? bigMath.mulDiv(sizeDeltaUsd, BASIS_POINTS_DIVISOR_BIGINT, leverage) : 0n;
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
  let evaluationPrice: bigint | undefined;

  if (triggerPrice !== undefined && triggerPrice > 0 && limitOrderType !== undefined) {
    indexPrice = triggerPrice;
    evaluationPrice = triggerPrice;
    initialCollateralPrice = initialCollateralToken.prices.minPrice;
    collateralPrice = getIsEquivalentTokens(collateralToken, indexToken)
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
    evaluationPrice,
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
    nextSizeInTokens,
    nextCollateralUsd,
    nextEntryPrice,
    nextLeverage,
    nextLiqPrice,
    nextPendingImpactDeltaUsd,
    potentialPriceImpactDiffUsd,
  };
}
