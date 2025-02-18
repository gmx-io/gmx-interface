import { selectPositionConstants } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxCloseSizeUsd,
  selectTradeboxCollateralToken,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxFees,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxIncreasePositionAmounts,
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
  selectTradeboxToToken,
  selectTradeboxToTokenAmount,
  selectTradeboxTradeFlags,
  selectTradeboxTradeRatios,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import {
  ValidationResult,
  getDecreaseError,
  getIncreaseError,
  getSwapError,
} from "domain/synthetics/trade/utils/validation";

export const selectTradeboxSwapTradeError = createSelector((q) => {
  const fromToken = q(selectTradeboxFromToken);
  const toToken = q(selectTradeboxToToken);
  const fromTokenAmount = q(selectTradeboxFromTokenAmount);
  const swapAmounts = q(selectTradeboxSwapAmounts);
  const toTokenAmount = q(selectTradeboxToTokenAmount);
  const { maxLiquidity: swapOutLiquidity } = q(selectTradeboxMaxLiquidityPath);
  const { isLimit } = q(selectTradeboxTradeFlags);
  const isWrapOrUnwrap = q(selectTradeboxIsWrapOrUnwrap);
  const { triggerRatio, markRatio } = q(selectTradeboxTradeRatios);
  const fees = q(selectTradeboxFees);

  return getSwapError({
    fromToken,
    toToken,
    fromTokenAmount,
    fromUsd: swapAmounts?.usdIn,
    toTokenAmount,
    toUsd: swapAmounts?.usdOut,
    swapPathStats: swapAmounts?.swapPathStats,
    swapLiquidity: swapOutLiquidity,
    externalSwapQuote: undefined,
    isLimit,
    isWrapOrUnwrap,
    triggerRatio,
    markRatio,
    fees,
  });
});

export const selectTradeboxIncreaseTradeError = createSelector((q) => {
  const marketInfo = q(selectTradeboxMarketInfo);
  const toToken = q(selectTradeboxToToken);
  const fromToken = q(selectTradeboxFromToken);
  const fromTokenAmount = q(selectTradeboxFromTokenAmount);
  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
  const collateralToken = q(selectTradeboxCollateralToken);
  const selectedPosition = q(selectTradeboxSelectedPosition);
  const fees = q(selectTradeboxFees);
  const { maxLiquidity: swapOutLiquidity } = q(selectTradeboxMaxLiquidityPath);
  const { minCollateralUsd } = q(selectPositionConstants);
  const { longLiquidity, shortLiquidity } = q(selectTradeboxLiquidity);
  const { isLong, isLimit } = q(selectTradeboxTradeFlags);
  const markPrice = q(selectTradeboxMarkPrice);
  const triggerPrice = q(selectTradeboxTriggerPrice);
  const nextPositionValues = q(selectTradeboxNextPositionValues);
  const nextLeverageWithoutPnl = q(selectTradeboxNextLeverageWithoutPnl);

  return getIncreaseError({
    marketInfo,
    indexToken: toToken,
    initialCollateralToken: fromToken,
    initialCollateralAmount: fromTokenAmount,
    initialCollateralUsd: increaseAmounts?.initialCollateralUsd,
    targetCollateralToken: collateralToken,
    collateralUsd: increaseAmounts?.collateralDeltaUsd,
    sizeDeltaUsd: increaseAmounts?.sizeDeltaUsd,
    existingPosition: selectedPosition,
    externalSwapQuote: increaseAmounts?.externalSwapQuote,
    fees,
    swapPathStats: increaseAmounts?.swapPathStats,
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
  });
});

export const selectTradeboxDecreaseTradeError = createSelector((q) => {
  const marketInfo = q(selectTradeboxMarketInfo);
  const closeSizeUsd = q(selectTradeboxCloseSizeUsd);
  const decreaseAmounts = q(selectTradeboxDecreasePositionAmounts);
  const selectedPosition = q(selectTradeboxSelectedPosition);
  const triggerPrice = q(selectTradeboxTriggerPrice);
  const markPrice = q(selectTradeboxMarkPrice);
  const nextPositionValues = q(selectTradeboxNextPositionValues);
  const { isLong } = q(selectTradeboxTradeFlags);
  const { minCollateralUsd } = q(selectPositionConstants);
  const stage = q(selectTradeboxStage);

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
    isTrigger: true,
    minCollateralUsd,
    isNotEnoughReceiveTokenLiquidity: false,
    triggerThresholdType: stage !== "trade" ? decreaseAmounts?.triggerThresholdType : undefined,
  });
});

const DEFAULT_TRADE_ERROR: ValidationResult = [undefined];
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
