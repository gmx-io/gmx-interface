import {
  selectTokensData,
  selectUiFeeFactor,
  selectUserReferralInfo,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxCollateralToken,
  selectTradeboxExistingPosition,
  selectTradeboxFindSwapPath,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxIsNeedSwap,
  selectTradeBoxLeverage,
  selectTradeboxLeverageStrategy,
  selectTradeboxMarketInfo,
  selectTradeboxSelectSwapToToken,
  selectTradeboxToTokenAmount,
  selectTradeboxTradeMode,
  selectTradeboxTradeType,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import {
  estimateExternalSwapFeesUsd,
  getExternalSwapInputsByFromValue,
  getExternalSwapInputsByLeverageSize,
} from "domain/synthetics/externalSwaps/utils";
import { mustNeverExist } from "lib/types";
import { createTradeFlags } from "sdk/utils/trade";
import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { getSwapDebugSettings, getSwapPriceImpactForExternalSwapThresholdBps } from "config/externalSwaps";
import { bigMath } from "sdk/utils/bigmath";
import { convertToTokenAmount } from "domain/synthetics/tokens";
import { getByKey } from "lib/objects";
import { ExternalSwapQuote } from "sdk/types/trade";
import { convertToUsd } from "domain/synthetics/tokens";

export const selectBaseExternalSwapOutput = (s: SyntheticsState) => s.externalSwap.baseOutput;
export const selectSetBaseExternalSwapOutput = (s: SyntheticsState) => s.externalSwap.setBaseOutput;

export const selectExternalSwapFails = (s: SyntheticsState) => s.externalSwap.fails;
export const selectSetExternalSwapFails = (s: SyntheticsState) => s.externalSwap.setFails;

export const selectShouldFallbackToInternalSwap = (s: SyntheticsState) => s.externalSwap.shouldFallbackToInternalSwap;
export const selectSetShouldFallbackToInternalSwap = (s: SyntheticsState) =>
  s.externalSwap.setShouldFallbackToInternalSwap;

export const selectExternalSwapQuote = createSelector((q) => {
  const tokensData = q(selectTokensData);

  const inputs = q(selectExternalSwapInputs);
  const baseOutput = q(selectBaseExternalSwapOutput);

  const debugForceExternalSwaps = q(selectDebugForceExternalSwaps);
  const shouldFallbackToInternalSwap = q(selectShouldFallbackToInternalSwap);

  const tokenIn = getByKey(tokensData, baseOutput?.inTokenAddress);
  const tokenOut = getByKey(tokensData, baseOutput?.outTokenAddress);

  if (!inputs || !baseOutput || !tokenIn || !tokenOut) {
    return undefined;
  }

  const priceIn = tokenIn.prices.minPrice;
  const priceOut = tokenOut.prices.maxPrice;

  let usdIn = convertToUsd(inputs.amountIn, tokenIn.decimals, priceIn)!;
  let amountIn = inputs.amountIn;

  const usdOut = convertToUsd(baseOutput.amountOut, tokenOut.decimals, priceOut)!;
  const amountOut = baseOutput.amountOut;

  if (inputs?.strategy === "leverageBySize") {
    usdIn = bigMath.mulDiv(usdIn, inputs.usdOut, usdOut);
    amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, priceIn)!;
  }

  const feesUsd = estimateExternalSwapFeesUsd({
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
  });

  const quote: ExternalSwapQuote = {
    ...baseOutput,
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    feesUsd,
  };

  const isInternalSwapBetter =
    inputs?.internalSwapTotalFeesDeltaUsd !== undefined && inputs.internalSwapTotalFeesDeltaUsd > -quote.feesUsd;

  if (!debugForceExternalSwaps && (isInternalSwapBetter || shouldFallbackToInternalSwap)) {
    return undefined;
  }

  return quote;
});

export const selectExternalSwapsEnabled = (s: SyntheticsState) =>
  s.settings.externalSwapsEnabled && !s.externalSwap.shouldFallbackToInternalSwap;

export const selectDebugForceExternalSwaps = createSelector((q) => {
  const isNeedSwap = q(selectTradeboxIsNeedSwap);
  const swapDebugSettings = getSwapDebugSettings();

  return isNeedSwap && (swapDebugSettings?.forceExternalSwaps || false);
});

export const selectShouldRequestExternalSwapQuote = createSelector((q) => {
  const isExternalSwapsEnabled = q(selectExternalSwapsEnabled);
  const externalSwapInputs = q(selectExternalSwapInputs);

  const internalSwapPriceImpactFeeItem = externalSwapInputs?.internalSwapPriceImpactFeeItem;
  const swapPriceImpactForExternalSwapThresholdBps = getSwapPriceImpactForExternalSwapThresholdBps();

  const isExternalSwapConditionMet =
    !internalSwapPriceImpactFeeItem || internalSwapPriceImpactFeeItem.bps < swapPriceImpactForExternalSwapThresholdBps;

  const debugForceExternalSwaps = q(selectDebugForceExternalSwaps);

  return debugForceExternalSwaps || (isExternalSwapsEnabled && isExternalSwapConditionMet);
});

export const selectExternalSwapInputsByFromValue = createSelector((q) => {
  const fromToken = q(selectTradeboxFromToken);
  const fromTokenAmount = q(selectTradeboxFromTokenAmount);
  const uiFeeFactor = q(selectUiFeeFactor);
  const swapToToken = q(selectTradeboxSelectSwapToToken);

  const findSwapPath = q(selectTradeboxFindSwapPath);

  if (!fromToken || !swapToToken) {
    return undefined;
  }

  return getExternalSwapInputsByFromValue({
    tokenIn: fromToken,
    tokenOut: swapToToken,
    amountIn: fromTokenAmount,
    findSwapPath,
    uiFeeFactor,
  });
});

export const selectExternalSwapInputsByLeverageSize = createSelector((q) => {
  const tokenIn = q(selectTradeboxFromToken);

  const tradeMode = q(selectTradeboxTradeMode);
  const tradeType = q(selectTradeboxTradeType);
  const tradeFlags = createTradeFlags(tradeType, tradeMode);
  const userReferralInfo = q(selectUserReferralInfo);
  const triggerPrice = q(selectTradeboxTriggerPrice);
  const collateralToken = q(selectTradeboxCollateralToken);

  const toTokenAmount = q(selectTradeboxToTokenAmount);
  const marketInfo = q(selectTradeboxMarketInfo);
  const leverage = q(selectTradeBoxLeverage);
  const uiFeeFactor = q(selectUiFeeFactor);

  const existingPosition = q(selectTradeboxExistingPosition);

  const findSwapPath = q(selectTradeboxFindSwapPath);

  if (!tokenIn || !collateralToken || !marketInfo) {
    return undefined;
  }

  return getExternalSwapInputsByLeverageSize({
    marketInfo,
    tokenIn,
    collateralToken,
    indexTokenAmount: toTokenAmount,
    findSwapPath,
    uiFeeFactor,
    triggerPrice,
    existingPosition,
    leverage,
    isLong: tradeFlags.isLong,
    userReferralInfo,
  });
});

export const selectExternalSwapInputs = createSelector((q) => {
  const tradeMode = q(selectTradeboxTradeMode);
  const tradeType = q(selectTradeboxTradeType);
  const tradeFlags = createTradeFlags(tradeType, tradeMode);
  const isNeedSwap = q(selectTradeboxIsNeedSwap);
  const strategy = q(selectTradeboxLeverageStrategy);

  if (!isNeedSwap) {
    return undefined;
  }

  if (!tradeFlags.isIncrease) {
    return undefined;
  }

  switch (strategy) {
    case "leverageByCollateral":
    case "independent": {
      return q(selectExternalSwapInputsByFromValue);
    }

    case "leverageBySize": {
      return q(selectExternalSwapInputsByLeverageSize);
    }

    default: {
      mustNeverExist(strategy);
    }
  }
});
