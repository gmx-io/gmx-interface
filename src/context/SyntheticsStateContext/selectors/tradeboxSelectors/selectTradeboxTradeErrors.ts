import {
  selectChainId,
  selectPositionConstants,
  selectUserReferralInfo,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectExternalSwapIsLoading,
  selectTradeboxCloseSizeUsd,
  selectTradeboxCollateralToken,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxFees,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxExistingPositionForPreview,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxIsFromTokenGmxAccount,
  selectTradeboxIsPositionLiquidatedBeforeTrigger,
  selectTradeboxIsWrapOrUnwrap,
  selectTradeboxLiquidity,
  selectTradeboxMarkPrice,
  selectTradeboxMarketInfo,
  selectTradeboxMaxLiquidityPath,
  selectTradeboxNextLeverageWithoutPnl,
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPosition,
  selectTradeboxStage,
  selectTradeboxSwapAmounts,
  selectTradeboxTwapNumberOfParts,
  selectTradeboxToToken,
  selectTradeboxToTokenAmount,
  selectTradeboxTradeFlags,
  selectTradeboxTradeRatios,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import {
  ValidationButtonTooltipName,
  ValidationResult,
  getDecreaseError,
  getIncreaseError,
  getSwapError,
} from "domain/synthetics/trade/utils/validation";
import { getIsIncreaseResultingPositionLiquidatable } from "domain/synthetics/trade/utils/warnings";
import { OrderType } from "sdk/utils/orders/types";
import { getIncreaseEvaluationIndexPrice, getIsIncreaseOrderExecutableNow } from "sdk/utils/prices";
import {
  getIncreaseResultingPositionMarginState,
  PositionMarginState,
} from "sdk/utils/trade/increaseMarginCheck";

const selectTradeboxSwapTradeError = createSelector((q) => {
  const fromToken = q(selectTradeboxFromToken);
  const toToken = q(selectTradeboxToToken);
  const fromTokenAmount = q(selectTradeboxFromTokenAmount);
  const swapAmounts = q(selectTradeboxSwapAmounts);
  const toTokenAmount = q(selectTradeboxToTokenAmount);
  const { maxLiquidity: swapOutLiquidity } = q(selectTradeboxMaxLiquidityPath);
  const { isLimit, isTwap } = q(selectTradeboxTradeFlags);
  const isWrapOrUnwrap = q(selectTradeboxIsWrapOrUnwrap);
  const isFromTokenGmxAccount = q(selectTradeboxIsFromTokenGmxAccount);
  const { triggerRatio, markRatio } = q(selectTradeboxTradeRatios);
  const fees = q(selectTradeboxFees);
  const numberOfParts = q(selectTradeboxTwapNumberOfParts);
  const chainId = q(selectChainId);
  const isExternalSwapLoading = q(selectExternalSwapIsLoading);

  return getSwapError({
    fromToken,
    toToken,
    fromTokenAmount,
    fromUsd: swapAmounts?.usdIn,
    toTokenAmount,
    toUsd: swapAmounts?.usdOut,
    swapPathStats: swapAmounts?.swapStrategy.swapPathStats,
    swapLiquidity: swapOutLiquidity,
    externalSwapQuote: swapAmounts?.swapStrategy.externalSwapQuote,
    isExternalSwapLoading,
    isLimit,
    isWrapOrUnwrap,
    isFromTokenGmxAccount,
    triggerRatio,
    markRatio,
    fees,
    isTwap,
    numberOfParts,
    chainId,
  });
});

export const selectTradeboxIncreaseResultingPositionMarginState = createSelector(
  (q): PositionMarginState | undefined => {
    const { isIncrease, isLong, isTwap } = q(selectTradeboxTradeFlags);

    if (!isIncrease || isTwap) {
      return undefined;
    }

    const marketInfo = q(selectTradeboxMarketInfo);
    const collateralToken = q(selectTradeboxCollateralToken);
    const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
    const { minCollateralUsd } = q(selectPositionConstants);

    if (!marketInfo || !collateralToken || !increaseAmounts || minCollateralUsd === undefined) {
      return undefined;
    }

    const existingPosition = q(selectTradeboxSelectedPosition);
    const userReferralInfo = q(selectUserReferralInfo);

    return getIncreaseResultingPositionMarginState({
      marketInfo,
      collateralToken,
      isLong,
      existingPosition,
      sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
      sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
      collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
      minCollateralUsd,
      userReferralInfo,
      indexPriceForEvaluation: getIncreaseEvaluationIndexPrice({
        orderType: increaseAmounts.limitOrderType ?? OrderType.MarketIncrease,
        isLong,
        triggerPrice: q(selectTradeboxTriggerPrice),
        indexTokenPrices: marketInfo.indexToken.prices,
      }),
    });
  }
);

export const selectTradeboxIsIncreaseExecutableNow = createSelector((q) => {
  const { isIncrease, isLong, isTwap } = q(selectTradeboxTradeFlags);

  if (!isIncrease || isTwap) {
    return false;
  }

  const marketInfo = q(selectTradeboxMarketInfo);

  if (!marketInfo) {
    return false;
  }

  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);

  return getIsIncreaseOrderExecutableNow({
    orderType: increaseAmounts?.limitOrderType ?? OrderType.MarketIncrease,
    isLong,
    triggerPrice: q(selectTradeboxTriggerPrice),
    indexTokenPrices: marketInfo.indexToken.prices,
  });
});

const selectTradeboxIncreaseTradeError = createSelector((q) => {
  const marketInfo = q(selectTradeboxMarketInfo);
  const toToken = q(selectTradeboxToToken);
  const fromToken = q(selectTradeboxFromToken);
  const fromTokenAmount = q(selectTradeboxFromTokenAmount);
  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
  const collateralToken = q(selectTradeboxCollateralToken);
  const existingPosition = q(selectTradeboxExistingPositionForPreview);
  const fees = q(selectTradeboxFees);
  const { maxLiquidity: swapOutLiquidity } = q(selectTradeboxMaxLiquidityPath);
  const { minCollateralUsd, minPositionSizeUsd } = q(selectPositionConstants);
  const { longLiquidity, shortLiquidity } = q(selectTradeboxLiquidity);
  const { isLong, isLimit, isTwap } = q(selectTradeboxTradeFlags);
  const markPrice = q(selectTradeboxMarkPrice);
  const triggerPrice = q(selectTradeboxTriggerPrice);
  const nextPositionValues = q(selectTradeboxNextPositionValues);
  const nextLeverageWithoutPnl = q(selectTradeboxNextLeverageWithoutPnl);
  const numberOfParts = q(selectTradeboxTwapNumberOfParts);
  const chainId = q(selectChainId);
  const isExternalSwapLoading = q(selectExternalSwapIsLoading);
  const resultingPositionMarginState = q(selectTradeboxIncreaseResultingPositionMarginState);
  const isResultingPositionCheckBlocking = q(selectTradeboxIsIncreaseExecutableNow);

  return getIncreaseError({
    marketInfo,
    indexToken: toToken,
    initialCollateralToken: fromToken,
    initialCollateralAmount: fromTokenAmount,
    initialCollateralUsd: increaseAmounts?.initialCollateralUsd,
    targetCollateralToken: collateralToken,
    collateralUsd: increaseAmounts?.collateralDeltaUsd,
    sizeDeltaUsd: increaseAmounts?.sizeDeltaUsd,
    existingPosition,
    externalSwapQuote: increaseAmounts?.swapStrategy.externalSwapQuote,
    isExternalSwapLoading,
    fees,
    swapPathStats: increaseAmounts?.swapStrategy.swapPathStats,
    collateralLiquidity: swapOutLiquidity,
    minCollateralUsd,
    longLiquidity,
    shortLiquidity,
    isLong,
    markPrice,
    triggerPrice,
    isLimit,
    nextPositionValues,
    nextLeverageWithoutPnl,
    thresholdType: increaseAmounts?.triggerThresholdType,
    numberOfParts,
    isTwap,
    minPositionSizeUsd,
    chainId,
    resultingPositionMarginState,
    isResultingPositionCheckBlocking,
  });
});

const selectTradeboxDecreaseTradeError = createSelector((q) => {
  const marketInfo = q(selectTradeboxMarketInfo);
  const closeSizeUsd = q(selectTradeboxCloseSizeUsd);
  const decreaseAmounts = q(selectTradeboxDecreasePositionAmounts);
  const selectedPosition = q(selectTradeboxSelectedPosition);
  const triggerPrice = q(selectTradeboxTriggerPrice);
  const markPrice = q(selectTradeboxMarkPrice);
  const nextPositionValues = q(selectTradeboxNextPositionValues);
  const { isLong, isTwap } = q(selectTradeboxTradeFlags);
  const { minCollateralUsd, minPositionSizeUsd } = q(selectPositionConstants);
  const stage = q(selectTradeboxStage);
  const numberOfParts = q(selectTradeboxTwapNumberOfParts);

  return getDecreaseError({
    marketInfo,
    inputSizeUsd: closeSizeUsd,
    sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
    triggerPrice,
    markPrice,
    existingPosition: selectedPosition,
    isContractAccount: false,
    receiveToken: selectedPosition?.collateralToken,
    nextPositionValues: nextPositionValues,
    isLong,
    isTrigger: stage !== "trade",
    minCollateralUsd,
    isNotEnoughReceiveTokenLiquidity: false,
    triggerThresholdType: stage !== "trade" ? decreaseAmounts?.triggerThresholdType : undefined,
    minPositionSizeUsd,
    isTwap,
    numberOfParts,
  });
});

const DEFAULT_TRADE_ERROR: ValidationResult = {};
export const selectTradeboxTradeTypeError = createSelector((q) => {
  const { isSwap, isIncrease, isTrigger } = q(selectTradeboxTradeFlags);
  let tradeError: ValidationResult = DEFAULT_TRADE_ERROR;

  if (isSwap) {
    tradeError = q(selectTradeboxSwapTradeError);
  } else if (isIncrease) {
    tradeError = q(selectTradeboxIncreaseTradeError);
  } else if (isTrigger) {
    tradeError = q(selectTradeboxDecreaseTradeError);
  }

  return tradeError;
});

export const selectTradeboxIncreaseFreshPositionWarning = createSelector((q) => {
  if (!q(selectTradeboxIsPositionLiquidatedBeforeTrigger)) {
    return false;
  }

  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);

  return increaseAmounts !== undefined && increaseAmounts.sizeDeltaUsd > 0;
});

export const selectTradeboxIncreaseMaxLeverageAlert = createSelector((q): "error" | "warning" | undefined => {
  const { isIncrease, isLimit } = q(selectTradeboxTradeFlags);

  if (!isIncrease) {
    return undefined;
  }

  if (q(selectTradeboxIncreaseResultingPositionMarginState)?.isLiquidatable !== true) {
    return undefined;
  }

  if (!isLimit || q(selectTradeboxIsIncreaseExecutableNow)) {
    return q(selectTradeboxIncreaseTradeError).buttonTooltipName ===
      ValidationButtonTooltipName.resultingPositionMaxLeverage
      ? "error"
      : undefined;
  }

  return q(selectTradeboxIncreaseTradeError).buttonErrorMessage ? undefined : "warning";
});

export const selectTradeboxIncreaseLiquidationRiskWarning = createSelector((q) => {
  const { isIncrease, isLimit, isLong } = q(selectTradeboxTradeFlags);

  if (!isIncrease || !isLimit) {
    return false;
  }

  if (q(selectTradeboxIncreaseTradeError).buttonErrorMessage) {
    return false;
  }

  if (q(selectTradeboxIncreaseResultingPositionMarginState)?.isLiquidatable === true) {
    return false;
  }

  const existingPosition = q(selectTradeboxSelectedPosition);
  const triggerPrice = q(selectTradeboxTriggerPrice);
  const nextPositionValues = q(selectTradeboxNextPositionValues);

  return getIsIncreaseResultingPositionLiquidatable({
    currentLiqPrice: existingPosition?.liquidationPrice,
    nextLiqPrice: nextPositionValues?.nextLiqPrice,
    triggerPrice,
    isLong,
  });
});
