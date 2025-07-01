import { getSwapDebugSettings, getSwapPriceImpactForExternalSwapThresholdBps } from "config/externalSwaps";
import { BASIS_POINTS_DIVISOR, BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { createSelector, createSelectorDeprecated } from "context/SyntheticsStateContext/utils";
import {
  getExternalSwapInputsByFromValue,
  getExternalSwapInputsByLeverageSize,
} from "domain/synthetics/externalSwaps/utils";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  estimateExecuteSwapOrderGasLimit,
  estimateOrderOraclePriceCount,
} from "domain/synthetics/fees";
import {
  MarketInfo,
  getAvailableUsdLiquidityForPosition,
  getMaxLeverageByMinCollateralFactor,
  getTradeboxLeverageSliderMarks,
} from "domain/synthetics/markets";
import { PreferredTradeTypePickStrategy, chooseSuitableMarket } from "domain/synthetics/markets/chooseSuitableMarket";
import { DecreasePositionSwapType, isLimitOrderType, isSwapOrderType } from "domain/synthetics/orders";
import {
  TokenData,
  TokensRatio,
  convertToTokenAmount,
  convertToUsd,
  getIsEquivalentTokens,
  getIsStake,
  getIsUnstake,
  getIsUnwrap,
  getIsWrap,
  getNeedTokenApprove,
  getTokensRatioByPrice,
} from "domain/synthetics/tokens";
import {
  ExternalSwapQuote,
  SwapOptimizationOrderArray,
  TradeFeesType,
  TradeMode,
  TradeType,
  getMarkPrice,
  getNextPositionExecutionPrice,
  getSwapAmountsByFromValue,
  getSwapAmountsByToValue,
  getTradeFees,
} from "domain/synthetics/trade";
import { getPositionKey } from "lib/legacy";
import { PRECISION, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { mustNeverExist } from "lib/types";
import { BOTANIX } from "sdk/configs/chains";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { getExecutionFee } from "sdk/utils/fees/executionFee";
import { createTradeFlags } from "sdk/utils/trade";

import { selectIsExpressTransactionAvailable } from "../expressSelectors";
import {
  selectAccount,
  selectChainId,
  selectGasLimits,
  selectGasPrice,
  selectOrdersInfoData,
  selectPositionsInfoData,
  selectTokensData,
  selectUiFeeFactor,
  selectUserReferralInfo,
} from "../globalSelectors";
import { selectIsLeverageSliderEnabled, selectIsPnlInLeverage } from "../settingsSelectors";
import { selectSelectedMarketVisualMultiplier } from "../shared/marketSelectors";
import {
  makeSelectDecreasePositionAmounts,
  makeSelectFindSwapPath,
  makeSelectIncreasePositionAmounts,
  makeSelectMaxLiquidityPath,
  makeSelectNextPositionValuesForDecrease,
  makeSelectNextPositionValuesForIncrease,
} from "../tradeSelectors";
import { selectTradeboxGetMaxLongShortLiquidityPool } from "./selectTradeboxGetMaxLongShortLiquidityPool";

export * from "./selectTradeboxAvailableAndDisabledTokensForCollateral";
export * from "./selectTradeboxAvailableMarketsOptions";
export * from "./selectTradeboxGetMaxLongShortLiquidityPool";

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

export const selectBaseExternalSwapOutput = (s: SyntheticsState) => s.externalSwap.baseOutput;
export const selectSetBaseExternalSwapOutput = (s: SyntheticsState) => s.externalSwap.setBaseOutput;

export const selectShouldFallbackToInternalSwap = (s: SyntheticsState) => s.externalSwap.shouldFallbackToInternalSwap;
export const selectSetShouldFallbackToInternalSwap = (s: SyntheticsState) =>
  s.externalSwap.setShouldFallbackToInternalSwap;

export const selectExternalSwapQuote = createSelector((q) => {
  const inputs = q(selectExternalSwapInputs);
  const baseOutput = q(selectBaseExternalSwapOutput);

  const debugForceExternalSwaps = q(selectDebugForceExternalSwaps);
  const shouldFallbackToInternalSwap = q(selectShouldFallbackToInternalSwap);

  const tokenIn = q(selectTradeboxFromToken);
  const tokenOut = q(selectTradeboxSelectSwapToToken);

  if (
    !inputs ||
    !baseOutput ||
    !tokenIn ||
    !tokenOut ||
    tokenIn.address !== baseOutput.inTokenAddress ||
    tokenOut.address !== baseOutput.outTokenAddress ||
    shouldFallbackToInternalSwap
  ) {
    return undefined;
  }

  let amountIn = baseOutput.amountIn;
  let priceIn = baseOutput.priceIn ?? tokenIn.prices.minPrice;
  let usdIn = baseOutput.usdIn ?? convertToUsd(amountIn, tokenIn.decimals, priceIn)!;

  const amountOut = baseOutput.amountOut;
  const priceOut = baseOutput.priceOut ?? tokenOut.prices.maxPrice;
  const usdOut = baseOutput.usdOut ?? convertToUsd(amountOut, tokenOut.decimals, priceOut)!;

  if (inputs?.strategy === "leverageBySize") {
    usdIn = bigMath.mulDiv(usdIn, inputs.usdOut, usdOut);
    amountIn = convertToTokenAmount(usdIn, tokenIn.decimals, baseOutput.priceIn)!;
  }

  const feesUsd = usdIn - usdOut;

  const quote: ExternalSwapQuote = {
    ...baseOutput,
    amountIn,
    usdIn,
    priceIn,
    amountOut,
    usdOut,
    priceOut,
    feesUsd,
  };

  const isInternalSwapBetter =
    inputs.internalSwapAmounts.amountOut > 0n &&
    inputs?.internalSwapTotalFeesDeltaUsd !== undefined &&
    inputs.internalSwapTotalFeesDeltaUsd > -quote.feesUsd;

  if (isInternalSwapBetter && !debugForceExternalSwaps) {
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

  const internalSwapTotalFeeItem = externalSwapInputs?.internalSwapTotalFeeItem;
  const swapPriceImpactForExternalSwapThresholdBps = getSwapPriceImpactForExternalSwapThresholdBps();

  const thereIsNoInternalSwap =
    !internalSwapTotalFeeItem ||
    (externalSwapInputs && externalSwapInputs.amountIn > 0n && externalSwapInputs.internalSwapAmounts.amountOut === 0n);

  const internalSwapFeesConditionMet =
    internalSwapTotalFeeItem && internalSwapTotalFeeItem.bps < swapPriceImpactForExternalSwapThresholdBps;

  const isExternalSwapConditionMet = thereIsNoInternalSwap || internalSwapFeesConditionMet;

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

export * from "./selectTradeboxRelatedMarketsStats";

const selectOnlyOnTradeboxPage = <T>(s: SyntheticsState, selection: T) =>
  s.pageType === "trade" ? selection : undefined;
export const selectTradeboxState = (s: SyntheticsState) => s.tradebox;
export const selectTradeboxTradeType = (s: SyntheticsState) => s.tradebox.tradeType;
export const selectTradeboxTradeMode = (s: SyntheticsState) => s.tradebox.tradeMode;
export const selectTradeboxFromTokenAddress = (s: SyntheticsState) => s.tradebox.fromTokenAddress;
export const selectTradeboxToTokenAddress = (s: SyntheticsState) => s.tradebox.toTokenAddress;
export const selectTradeboxMarketAddress = (s: SyntheticsState) =>
  selectOnlyOnTradeboxPage(s, s.tradebox.marketAddress);
export const selectTradeboxMarketInfo = (s: SyntheticsState) => s.tradebox?.marketInfo;
export const selectTradeboxCollateralTokenAddress = (s: SyntheticsState) =>
  selectOnlyOnTradeboxPage(s, s.tradebox.collateralAddress);
export const selectTradeboxCollateralToken = (s: SyntheticsState) => s.tradebox.collateralToken;
export const selectTradeboxAvailableTradeModes = (s: SyntheticsState) => s.tradebox.availableTradeModes;
export const selectTradeboxAvailableTokensOptions = (s: SyntheticsState) => s.tradebox.availableTokensOptions;
export const selectTradeboxFromTokenInputValue = (s: SyntheticsState) => s.tradebox.fromTokenInputValue;
export const selectTradeboxToTokenInputValue = (s: SyntheticsState) => s.tradebox.toTokenInputValue;
export const selectTradeboxStage = (s: SyntheticsState) => s.tradebox.stage;
export const selectTradeboxFocusedInput = (s: SyntheticsState) => s.tradebox.focusedInput;
export const selectTradeboxDefaultTriggerAcceptablePriceImpactBps = (s: SyntheticsState) =>
  s.tradebox.defaultTriggerAcceptablePriceImpactBps;
export const selectTradeboxSetDefaultTriggerAcceptablePriceImpactBps = (s: SyntheticsState) =>
  s.tradebox.setDefaultTriggerAcceptablePriceImpactBps;
export const selectTradeboxSelectedTriggerAcceptablePriceImpactBps = (s: SyntheticsState) =>
  s.tradebox.selectedTriggerAcceptablePriceImpactBps;
export const selectTradeboxSetSelectedAcceptablePriceImpactBps = (s: SyntheticsState) =>
  s.tradebox.setSelectedAcceptablePriceImpactBps;
export const selectTradeboxDefaultAllowedSwapSlippageBps = (s: SyntheticsState) =>
  s.tradebox.defaultAllowedSwapSlippageBps;
export const selectTradeboxSetDefaultAllowedSwapSlippageBps = (s: SyntheticsState) =>
  s.tradebox.setDefaultAllowedSwapSlippageBps;
export const selectTradeboxSelectedAllowedSwapSlippageBps = (s: SyntheticsState) =>
  s.tradebox.selectedAllowedSwapSlippageBps;
export const selectTradeboxSetSelectedAllowedSwapSlippageBps = (s: SyntheticsState) =>
  s.tradebox.setSelectedAllowedSwapSlippageBps;
export const selectTradeboxCloseSizeInputValue = (s: SyntheticsState) => s.tradebox.closeSizeInputValue;
export const selectTradeboxTriggerPriceInputValue = (s: SyntheticsState) => s.tradebox.triggerPriceInputValue;
export const selectTradeboxTriggerRatioInputValue = (s: SyntheticsState) => s.tradebox.triggerRatioInputValue;
export const selectTradeboxLeverageOption = (s: SyntheticsState) => s.tradebox.leverageOption;
export const selectTradeboxKeepLeverage = (s: SyntheticsState) => s.tradebox.keepLeverage;
export const selectTradeboxSetActivePosition = (s: SyntheticsState) => s.tradebox.setActivePosition;
export const selectTradeboxSetToTokenAddress = (s: SyntheticsState) => s.tradebox.setToTokenAddress;
export const selectTradeboxSetTradeConfig = (s: SyntheticsState) => s.tradebox.setTradeConfig;
export const selectTradeboxSetKeepLeverage = (s: SyntheticsState) => s.tradebox.setKeepLeverage;
export const selectTradeboxSetCollateralAddress = (s: SyntheticsState) => s.tradebox.setCollateralAddress;
export const selectTradeboxAdvancedOptions = (s: SyntheticsState) => s.tradebox.advancedOptions;
export const selectTradeboxSetAdvancedOptions = (s: SyntheticsState) => s.tradebox.setAdvancedOptions;
export const selectTradeboxAllowedSlippage = (s: SyntheticsState) => s.tradebox.allowedSlippage;
export const selectSetTradeboxAllowedSlippage = (s: SyntheticsState) => s.tradebox.setAllowedSlippage;
export const selectTradeboxTokensAllowance = (s: SyntheticsState) => s.tradebox.tokensAllowance;
export const selectTradeBoxTokensAllowanceLoaded = (s: SyntheticsState) => s.tradebox.tokensAllowance.isLoaded;
export const selectTradeboxTwapDuration = (s: SyntheticsState) => s.tradebox.duration;
export const selectTradeboxTwapNumberOfParts = (s: SyntheticsState) => s.tradebox.numberOfParts;

export const selectTradeboxIsWrapOrUnwrap = createSelector((q) => {
  const fromToken = q(selectTradeboxFromToken);
  const toToken = q(selectTradeboxToToken);

  return Boolean(fromToken && toToken && (getIsWrap(fromToken, toToken) || getIsUnwrap(fromToken, toToken)));
});

export const selectTradeboxIsStakeOrUnstake = createSelector((q) => {
  const fromToken = q(selectTradeboxFromToken);
  const toToken = q(selectTradeboxToToken);

  return Boolean(fromToken && toToken && (getIsStake(fromToken, toToken) || getIsUnstake(fromToken, toToken)));
});

export const selectTradeboxTotalSwapImpactBps = createSelector((q) => {
  const fees = q(selectTradeboxFees);
  let swapPriceImpact = fees?.swapPriceImpact?.bps ?? 0n;

  const swapFees = fees?.swapFees ?? [];

  return (
    swapPriceImpact +
    (swapFees.length
      ? swapFees.reduce((acc, fee) => {
          return acc + (fee.bps ?? 0n);
        }, 0n)
      : 0n)
  );
});

export const selectTradeboxFindSwapPath = createSelector((q) => {
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const swapToTokenAddress = q(selectTradeboxSwapToTokenAddress);

  return q(makeSelectFindSwapPath(fromTokenAddress, swapToTokenAddress));
});

export const selectTradeboxMaxLiquidityPath = createSelector((q) => {
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const toTokenAddress = q(selectTradeboxToTokenAddress);
  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
  const tradeMode = q(selectTradeboxTradeMode);
  const tradeType = q(selectTradeboxTradeType);
  const tradeFlags = createTradeFlags(tradeType, tradeMode);

  return q(
    makeSelectMaxLiquidityPath(fromTokenAddress, tradeFlags.isPosition ? collateralTokenAddress : toTokenAddress)
  );
});

export const selectTradeboxToTokenAmount = createSelector((q) => {
  const toToken = q(selectTradeboxToToken);

  if (!toToken) return 0n;

  const toTokenInputValue = q(selectTradeboxToTokenInputValue);
  const visualMultiplier = q(selectSelectedMarketVisualMultiplier);

  const parsedValue = parseValue(toTokenInputValue || "0", toToken.decimals);

  if (parsedValue === undefined || parsedValue === 0n) return 0n;

  return parsedValue * BigInt(visualMultiplier);
});

export const selectTradeboxFromTokenAmount = createSelector((q) => {
  const fromToken = q(selectTradeboxFromToken);
  const fromTokenInputValue = q(selectTradeboxFromTokenInputValue);

  if (!fromToken) return 0n;

  const parsedValue = parseValue(fromTokenInputValue || "0", fromToken.decimals);

  if (parsedValue === undefined || parsedValue === 0n) return 0n;

  return parsedValue;
});

export const selectTradeBoxLeverage = createSelector((q) => {
  const leverageOption = q(selectTradeboxLeverageOption);
  return BigInt(parseInt(String(Number(leverageOption!) * BASIS_POINTS_DIVISOR)));
});

export const getTradeBoxLeverageStrategy = (s: SyntheticsState) => {
  const isLeverageEnabled = s.settings.isLeverageSliderEnabled;
  const focusedInput = s.tradebox.focusedInput;
  return isLeverageEnabled ? (focusedInput === "from" ? "leverageByCollateral" : "leverageBySize") : "independent";
};

export const selectTradeboxLeverageStrategy = createSelector((q) => {
  const isLeverageEnabled = q(selectIsLeverageSliderEnabled);
  const focusedInput = q(selectTradeboxFocusedInput);
  return isLeverageEnabled ? (focusedInput === "from" ? "leverageByCollateral" : "leverageBySize") : "independent";
});

export const selectTradeboxIncreasePositionAmounts = createSelector((q) => {
  const tokensData = q(selectTokensData);
  const tradeMode = q(selectTradeboxTradeMode);
  const tradeType = q(selectTradeboxTradeType);
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const fromTokenInputValue = q(selectTradeboxFromTokenInputValue);
  const toTokenAddress = q(selectTradeboxToTokenAddress);
  const toTokenAmount = q(selectTradeboxToTokenAmount);
  const marketAddress = q(selectTradeboxMarketAddress);
  const leverage = q(selectTradeBoxLeverage);
  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
  const selectedTriggerAcceptablePriceImpactBps = q(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
  const triggerPrice = q(selectTradeboxTriggerPrice);
  const externalSwapQuote = q(selectExternalSwapQuote);
  const tradeFlags = createTradeFlags(tradeType, tradeMode);
  const fromToken = fromTokenAddress ? getByKey(tokensData, fromTokenAddress) : undefined;
  const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : 0n;

  const positionKey = q(selectTradeboxSelectedPositionKey);
  const strategy = q(selectTradeboxLeverageStrategy);
  const isExpressTxn = fromTokenAddress !== NATIVE_TOKEN_ADDRESS && q(selectIsExpressTransactionAvailable);

  const selector = makeSelectIncreasePositionAmounts({
    collateralTokenAddress,
    fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
    indexTokenAddress: toTokenAddress,
    indexTokenAmount: toTokenAmount,
    initialCollateralAmount: fromTokenAmount,
    initialCollateralTokenAddress: fromTokenAddress,
    leverage,
    marketAddress,
    positionKey,
    strategy,
    tradeMode,
    tradeType,
    triggerPrice,
    tokenTypeForSwapRoute: tradeFlags.isPosition ? "collateralToken" : "indexToken",
    isExpressTxn,
    externalSwapQuote,
  });

  return q(selector);
});

export const selectTradeboxDecreasePositionAmounts = createSelector((q) => {
  const tradeMode = q(selectTradeboxTradeMode);
  const tradeType = q(selectTradeboxTradeType);
  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
  const marketAddress = q(selectTradeboxMarketAddress);
  const triggerPrice = q(selectTradeboxTriggerPrice);
  const closeSizeInputValue = q(selectTradeboxCloseSizeInputValue);
  const keepLeverage = q(selectTradeboxKeepLeverage);
  const selectedTriggerAcceptablePriceImpactBps = q(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
  const positionKey = q(selectTradeboxSelectedPositionKey);

  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;

  if (typeof keepLeverage === "undefined")
    throw new Error("selectTradeboxDecreasePositionAmounts: keepLeverage is undefined");

  const selector = makeSelectDecreasePositionAmounts({
    collateralTokenAddress: collateralTokenAddress,
    fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
    marketAddress,
    positionKey,
    tradeMode,
    tradeType,
    triggerPrice,
    closeSizeUsd,
    keepLeverage,
    receiveTokenAddress: undefined,
  });

  return q(selector);
});

export const selectTradeboxSwapAmounts = createSelector((q) => {
  const tradeMode = q(selectTradeboxTradeMode);
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const fromToken = q(selectTradeboxFromToken);
  const fromTokenAmount = q(selectTradeboxFromTokenAmount);

  const toToken = q(selectTradeboxToToken);
  const toTokenAmount = q(selectTradeboxToTokenAmount);
  const amountBy = q(selectTradeboxFocusedInput);
  const uiFeeFactor = q(selectUiFeeFactor);
  const allowedSwapSlippageBps = q(selectTradeboxSelectedAllowedSwapSlippageBps);

  const tradeFlags = createTradeFlags(TradeType.Swap, tradeMode);
  const fromTokenPrice = fromToken?.prices.minPrice;

  if (!fromToken || !toToken || fromTokenPrice === undefined) {
    return undefined;
  }

  const toSwapToken = q(selectTradeboxSwapToTokenAddress);
  const findSwapPath = q(makeSelectFindSwapPath(fromTokenAddress, toSwapToken));
  const swapOptimizationOrder: SwapOptimizationOrderArray | undefined = tradeFlags.isLimit
    ? ["length", "liquidity"]
    : undefined;

  const { markRatio, triggerRatio } = q(selectTradeboxTradeRatios);

  if (amountBy === "from") {
    return getSwapAmountsByFromValue({
      tokenIn: fromToken,
      tokenOut: toToken,
      amountIn: fromTokenAmount,
      triggerRatio: triggerRatio || markRatio,
      isLimit: tradeFlags.isLimit,
      findSwapPath,
      uiFeeFactor,
      swapOptimizationOrder,
      allowedSwapSlippageBps: tradeFlags.isLimit && tradeFlags.isSwap ? allowedSwapSlippageBps : undefined,
    });
  } else {
    return getSwapAmountsByToValue({
      tokenIn: fromToken,
      tokenOut: toToken,
      amountOut: toTokenAmount,
      triggerRatio: triggerRatio || markRatio,
      isLimit: tradeFlags.isLimit,
      findSwapPath,
      uiFeeFactor,
      swapOptimizationOrder,
      allowedSwapSlippageBps: tradeFlags.isLimit && tradeFlags.isSwap ? allowedSwapSlippageBps : undefined,
    });
  }
});

export const selectTradeboxTradeFlags = createSelector((q) => {
  const tradeType = q(selectTradeboxTradeType);
  const tradeMode = q(selectTradeboxTradeMode);
  const tradeFlags = createTradeFlags(tradeType, tradeMode);
  return tradeFlags;
});

export const selectTradeboxLeverage = createSelectorDeprecated([selectTradeboxLeverageOption], (leverageOption) =>
  BigInt(parseInt(String(Number(leverageOption!) * BASIS_POINTS_DIVISOR)))
);

export const selectTradeboxTradeFeesType = createSelector(
  function selectTradeboxTradeFeesType(q): TradeFeesType | null {
    const { isSwap, isIncrease, isTrigger } = q(selectTradeboxTradeFlags);

    const chainId = q(selectChainId);
    const isBotanix = chainId === BOTANIX;

    if (isSwap) {
      const swapAmounts = q(selectTradeboxSwapAmounts);
      const swapPathStats = swapAmounts?.swapPathStats;
      if (swapPathStats || (isBotanix && swapAmounts)) return "swap";
    }

    if (isIncrease) {
      const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
      if (increaseAmounts) return "increase";
    }

    if (isTrigger) {
      const decreaseAmounts = q(selectTradeboxDecreasePositionAmounts);
      if (decreaseAmounts) return "decrease";
    }

    return null;
  }
);

const selectTradeboxEstimatedGas = createSelector(function selectTradeboxEstimatedGas(q) {
  const gasLimit = q(selectTradeboxOrderGasLimit);

  if (gasLimit === null) return null;

  return gasLimit;
});

const selectTradeboxOrderGasLimit = createSelector(function selectTradeboxOrderGasLimit(q) {
  const tradeFeesType = q(selectTradeboxTradeFeesType);

  if (!tradeFeesType) return null;

  const gasLimits = q(selectGasLimits);

  if (!gasLimits) return null;

  switch (tradeFeesType) {
    case "swap": {
      const swapAmounts = q(selectTradeboxSwapAmounts);

      if (!swapAmounts || !swapAmounts.swapPathStats) return null;

      return estimateExecuteSwapOrderGasLimit(gasLimits, {
        swapsCount: swapAmounts?.swapPathStats?.swapPath.length ?? 0,
        callbackGasLimit: 0n,
      });
    }
    case "increase": {
      const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);

      if (!increaseAmounts) return null;

      return estimateExecuteIncreaseOrderGasLimit(gasLimits, {
        swapsCount: increaseAmounts.swapPathStats?.swapPath.length,
      });
    }
    case "decrease": {
      const decreaseAmounts = q(selectTradeboxDecreasePositionAmounts);

      if (!decreaseAmounts) return null;

      return estimateExecuteDecreaseOrderGasLimit(gasLimits, {
        callbackGasLimit: 0n,
        decreaseSwapType: decreaseAmounts.decreaseSwapType,
        swapsCount: 0,
      });
    }
    case "edit":
      return null;
    default:
      throw mustNeverExist(tradeFeesType);
  }
});

const selectTradeboxSwapCount = createSelector(function selectTradeboxSwapCount(q) {
  const { isSwap, isIncrease } = q(selectTradeboxTradeFlags);
  if (isSwap) {
    const swapAmounts = q(selectTradeboxSwapAmounts);
    if (!swapAmounts) return undefined;
    return swapAmounts.swapPathStats?.swapPath.length ?? 0;
  } else if (isIncrease) {
    const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
    if (!increaseAmounts) return undefined;
    return increaseAmounts.swapPathStats?.swapPath.length ?? 0;
  } else {
    const decreaseSwapType = q(selectTradeboxDecreasePositionAmounts)?.decreaseSwapType;
    if (decreaseSwapType === undefined) return undefined;
    return decreaseSwapType !== DecreasePositionSwapType.NoSwap ? 1 : 0;
  }
});

export const selectTradeboxExecutionFee = createSelector(function selectTradeboxExecutionFee(q) {
  const gasLimits = q(selectGasLimits);
  if (!gasLimits) return undefined;

  const tokensData = q(selectTokensData);
  if (!tokensData) return undefined;

  const gasPrice = q(selectGasPrice);
  if (gasPrice === undefined) return undefined;

  const estimatedGas = q(selectTradeboxEstimatedGas);
  if (estimatedGas === null || estimatedGas === undefined) return undefined;

  const chainId = q(selectChainId);

  const swapsCount = q(selectTradeboxSwapCount);

  if (swapsCount === undefined) return undefined;

  const oraclePriceCount = estimateOrderOraclePriceCount(swapsCount);

  const tradeMode = q(selectTradeboxTradeMode);
  const numberOfParts = q(selectTradeboxTwapNumberOfParts);

  return getExecutionFee(
    chainId,
    gasLimits,
    tokensData,
    estimatedGas,
    gasPrice,
    oraclePriceCount,
    tradeMode === TradeMode.Twap ? numberOfParts : undefined
  );
});

export const selectTradeboxTriggerRatioValue = createSelector(function selectTradeboxTriggerRatioValue(q) {
  const triggerRatioInputValue = q(selectTradeboxTriggerRatioInputValue);
  return parseValue(triggerRatioInputValue, USD_DECIMALS);
});

export const selectTradeboxFees = createSelector(function selectTradeboxFees(q) {
  const tradeFeesType = q(selectTradeboxTradeFeesType);

  if (!tradeFeesType) return undefined;

  const uiFeeFactor = q(selectUiFeeFactor);

  switch (tradeFeesType) {
    case "swap": {
      const swapAmounts = q(selectTradeboxSwapAmounts);

      if (!swapAmounts || !swapAmounts.swapPathStats) return undefined;

      return getTradeFees({
        initialCollateralUsd: swapAmounts.usdIn,
        collateralDeltaUsd: 0n,
        sizeDeltaUsd: 0n,
        swapSteps: swapAmounts.swapPathStats.swapSteps,
        externalSwapQuote: undefined,
        positionFeeUsd: 0n,
        swapPriceImpactDeltaUsd: swapAmounts.swapPathStats.totalSwapPriceImpactDeltaUsd,
        positionPriceImpactDeltaUsd: 0n,
        priceImpactDiffUsd: 0n,
        borrowingFeeUsd: 0n,
        fundingFeeUsd: 0n,
        feeDiscountUsd: 0n,
        swapProfitFeeUsd: 0n,
        uiFeeFactor,
      });
    }
    case "increase": {
      const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);

      if (!increaseAmounts) return undefined;

      const selectedPosition = q(selectTradeboxSelectedPosition);

      return getTradeFees({
        initialCollateralUsd: increaseAmounts.initialCollateralUsd,
        collateralDeltaUsd: increaseAmounts.initialCollateralUsd, // pay token amount in usd
        sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
        swapSteps: increaseAmounts.swapPathStats?.swapSteps || [],
        externalSwapQuote: increaseAmounts.externalSwapQuote,
        positionFeeUsd: increaseAmounts.positionFeeUsd,
        swapPriceImpactDeltaUsd: increaseAmounts.swapPathStats?.totalSwapPriceImpactDeltaUsd || 0n,
        positionPriceImpactDeltaUsd: increaseAmounts.positionPriceImpactDeltaUsd,
        priceImpactDiffUsd: 0n,
        borrowingFeeUsd: selectedPosition?.pendingBorrowingFeesUsd || 0n,
        fundingFeeUsd: selectedPosition?.pendingFundingFeesUsd || 0n,
        feeDiscountUsd: increaseAmounts.feeDiscountUsd,
        swapProfitFeeUsd: 0n,
        uiFeeFactor,
      });
    }
    case "decrease": {
      const decreaseAmounts = q(selectTradeboxDecreasePositionAmounts);
      const position = q(selectTradeboxSelectedPosition);

      if (!decreaseAmounts || !position) return undefined;

      const selectedPosition = q(selectTradeboxSelectedPosition);

      const sizeReductionBps = bigMath.mulDiv(
        decreaseAmounts.sizeDeltaUsd,
        BASIS_POINTS_DIVISOR_BIGINT,
        position.sizeInUsd
      );
      const collateralDeltaUsd = bigMath.mulDiv(position.collateralUsd, sizeReductionBps, BASIS_POINTS_DIVISOR_BIGINT);

      return getTradeFees({
        initialCollateralUsd: selectedPosition?.collateralUsd || 0n,
        collateralDeltaUsd,
        sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
        swapSteps: [],
        externalSwapQuote: undefined,
        positionFeeUsd: decreaseAmounts.positionFeeUsd,
        swapPriceImpactDeltaUsd: 0n,
        positionPriceImpactDeltaUsd: decreaseAmounts.positionPriceImpactDeltaUsd,
        priceImpactDiffUsd: decreaseAmounts.priceImpactDiffUsd,
        borrowingFeeUsd: decreaseAmounts.borrowingFeeUsd,
        fundingFeeUsd: decreaseAmounts.fundingFeeUsd,
        feeDiscountUsd: decreaseAmounts.feeDiscountUsd,
        swapProfitFeeUsd: decreaseAmounts.swapProfitFeeUsd,
        uiFeeFactor,
      });
    }
    case "edit":
      return undefined;
    default:
      throw mustNeverExist(tradeFeesType);
  }
});

const selectNextValuesForIncrease = createSelector(
  (q): Parameters<typeof makeSelectNextPositionValuesForIncrease>[0] => {
    const tokensData = q(selectTokensData);
    const tradeMode = q(selectTradeboxTradeMode);
    const tradeType = q(selectTradeboxTradeType);
    const fromTokenAddress = q(selectTradeboxFromTokenAddress);
    const fromTokenInputValue = q(selectTradeboxFromTokenInputValue);
    const toTokenAddress = q(selectTradeboxToTokenAddress);
    const toTokenAmount = q(selectTradeboxToTokenAmount);
    const marketAddress = q(selectTradeboxMarketAddress);
    const leverageOption = q(selectTradeboxLeverageOption);
    const isLeverageSliderEnabled = q(selectIsLeverageSliderEnabled);
    const focusedInput = q(selectTradeboxFocusedInput);
    const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
    const selectedTriggerAcceptablePriceImpactBps = q(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
    const triggerPrice = q(selectTradeboxTriggerPrice);
    const positionKey = q(selectTradeboxSelectedPositionKey);

    const tradeFlags = createTradeFlags(tradeType, tradeMode);
    const fromToken = fromTokenAddress ? getByKey(tokensData, fromTokenAddress) : undefined;
    const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : 0n;
    const leverage = BigInt(parseInt(String(Number(leverageOption!) * BASIS_POINTS_DIVISOR)));
    const isPnlInLeverage = q(selectIsPnlInLeverage);

    const externalSwapQuote = q(selectExternalSwapQuote);
    const isExpressTxn = fromTokenAddress !== NATIVE_TOKEN_ADDRESS && q(selectIsExpressTransactionAvailable);

    return {
      collateralTokenAddress,
      fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
      indexTokenAddress: toTokenAddress,
      indexTokenAmount: toTokenAmount,
      initialCollateralAmount: fromTokenAmount,
      initialCollateralTokenAddress: fromTokenAddress,
      leverage,
      marketAddress,
      positionKey,
      increaseStrategy: isLeverageSliderEnabled
        ? focusedInput === "from"
          ? "leverageByCollateral"
          : "leverageBySize"
        : "independent",
      tradeMode,
      tradeType,
      triggerPrice,
      tokenTypeForSwapRoute: tradeFlags.isPosition ? "collateralToken" : "indexToken",
      isPnlInLeverage,
      externalSwapQuote,
      isExpressTxn,
    };
  }
);

export const selectTradeboxNextPositionValuesForIncrease = createSelector((q) => {
  const increaseArgs = q(selectNextValuesForIncrease);

  if (!increaseArgs) return undefined;

  const selector = makeSelectNextPositionValuesForIncrease(increaseArgs);

  return q(selector);
});

const selectTradeboxNextPositionValuesForIncreaseWithoutPnlInLeverage = createSelector((q) => {
  const increaseArgs = q(selectNextValuesForIncrease);

  if (!increaseArgs) return undefined;

  const selector = makeSelectNextPositionValuesForIncrease({ ...increaseArgs, isPnlInLeverage: false });

  return q(selector);
});

export const selectTradeboxTriggerPrice = createSelector((q) => {
  const triggerPriceInputValue = q(selectTradeboxTriggerPriceInputValue);
  const visualMultiplier = q(selectSelectedMarketVisualMultiplier);

  const parsedValue = parseValue(triggerPriceInputValue, USD_DECIMALS);

  if (parsedValue === undefined || parsedValue === 0n) return undefined;

  return parsedValue / BigInt(visualMultiplier);
});

const selectNextValuesDecreaseArgs = createSelector((q) => {
  const tradeMode = q(selectTradeboxTradeMode);
  const tradeType = q(selectTradeboxTradeType);
  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
  const marketAddress = q(selectTradeboxMarketAddress);
  const closeSizeInputValue = q(selectTradeboxCloseSizeInputValue);
  const keepLeverage = q(selectTradeboxKeepLeverage);
  const selectedTriggerAcceptablePriceImpactBps = q(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
  const positionKey = q(selectTradeboxSelectedPositionKey);
  const isPnlInLeverage = q(selectIsPnlInLeverage);
  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;
  const triggerPrice = q(selectTradeboxTriggerPrice);

  return {
    collateralTokenAddress: collateralTokenAddress,
    fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
    marketAddress,
    positionKey,
    tradeMode,
    tradeType,
    triggerPrice,
    closeSizeUsd,
    keepLeverage,
    isPnlInLeverage,
    receiveTokenAddress: undefined,
  };
});

export const selectTradeboxNextPositionValuesForDecrease = createSelector((q) => {
  const decreaseArgs = q(selectNextValuesDecreaseArgs);

  if (!decreaseArgs) return undefined;

  const selector = makeSelectNextPositionValuesForDecrease(decreaseArgs);

  return q(selector);
});

const selectTradeboxNextPositionValuesForDecreaseWithoutPnlInLeverage = createSelector((q) => {
  const decreaseArgs = q(selectNextValuesDecreaseArgs);

  if (!decreaseArgs) return undefined;

  const selector = makeSelectNextPositionValuesForDecrease({ ...decreaseArgs, isPnlInLeverage: false });

  return q(selector);
});

export const selectTradeboxNextLeverageWithoutPnl = createSelector((q) => {
  const tradeFlags = q(selectTradeboxTradeFlags);
  const nextValues = tradeFlags.isIncrease
    ? q(selectTradeboxNextPositionValuesForIncreaseWithoutPnlInLeverage)
    : q(selectTradeboxNextPositionValuesForDecreaseWithoutPnlInLeverage);

  return nextValues?.nextLeverage;
});

export const selectTradeboxNextPositionValues = createSelector((q) => {
  const { isIncrease } = q(selectTradeboxTradeFlags);
  return isIncrease ? q(selectTradeboxNextPositionValuesForIncrease) : q(selectTradeboxNextPositionValuesForDecrease);
});

export const selectTradeboxSelectedPositionKey = createSelectorDeprecated(
  [selectAccount, selectTradeboxCollateralTokenAddress, selectTradeboxMarketAddress, selectTradeboxTradeFlags],
  (account, collateralAddress, marketAddress, tradeFlags) => {
    if (!account || !collateralAddress || !marketAddress) {
      return undefined;
    }

    return getPositionKey(account, marketAddress, collateralAddress, tradeFlags.isLong);
  }
);

export const selectTradeboxSelectedPosition = createSelectorDeprecated(
  [selectTradeboxSelectedPositionKey, selectPositionsInfoData],
  (selectedPositionKey, positionsInfoData) => getByKey(positionsInfoData, selectedPositionKey)
);

export const selectTradeboxExistingOrders = createSelector((q) => {
  const ordersInfoData = q(selectOrdersInfoData);

  return Object.values(ordersInfoData || {});
});

export const selectTradeboxExistingOrder = createSelector((q) => {
  const selectedPositionKey = q(selectTradeboxSelectedPositionKey);

  if (!selectedPositionKey) {
    return undefined;
  }

  const chainId = q(selectChainId);

  return q(selectTradeboxExistingOrders)
    .filter((order) => !isSwapOrderType(order.orderType))
    .find((order) => {
      const positionKey = getPositionKey(
        order.account,
        order.marketAddress,
        order.shouldUnwrapNativeToken
          ? convertTokenAddress(chainId, order.targetCollateralToken.address, "wrapped")
          : order.targetCollateralToken.address,
        order.isLong,
        order.shouldUnwrapNativeToken
          ? // Noop: if order.shouldUnwrapNativeToken is true, then order.targetCollateralToken.address is already native
            convertTokenAddress(chainId, order.targetCollateralToken.address, "native")
          : undefined
      );

      return positionKey === selectedPositionKey;
    });
});

export const selectTradeboxExistingLimitOrder = createSelector((q) => {
  const selectedPositionKey = q(selectTradeboxSelectedPositionKey);

  if (!selectedPositionKey) {
    return undefined;
  }

  const chainId = q(selectChainId);

  return q(selectTradeboxExistingOrders)
    .filter((order) => isLimitOrderType(order.orderType))
    .find((order) => {
      const positionKey = getPositionKey(
        order.account,
        order.marketAddress,
        order.shouldUnwrapNativeToken
          ? convertTokenAddress(chainId, order.targetCollateralToken.address, "wrapped")
          : order.targetCollateralToken.address,
        order.isLong,
        order.shouldUnwrapNativeToken
          ? // Noop: if order.shouldUnwrapNativeToken is true, then order.targetCollateralToken.address is already native
            convertTokenAddress(chainId, order.targetCollateralToken.address, "native")
          : undefined
      );

      return positionKey === selectedPositionKey;
    });
});

export type AvailableMarketsOptions = {
  allMarkets?: MarketInfo[];
  availableMarkets?: MarketInfo[];
  marketWithPosition?: MarketInfo;
  collateralWithPosition?: TokenData;
  marketWithOrder?: MarketInfo;
  collateralWithOrder?: TokenData;
  collateralWithOrderShouldUnwrapNativeToken?: boolean;
  maxLiquidityMarket?: MarketInfo;
  minPriceImpactMarket?: MarketInfo;
  minPriceImpactBps?: bigint;
  isNoSufficientLiquidityInAnyMarket?: boolean;
};

export const selectTradeboxHasExistingOrder = createSelector((q) => !!q(selectTradeboxExistingOrder));
export const selectTradeboxHasExistingLimitOrder = createSelector((q) => !!q(selectTradeboxExistingLimitOrder));
export const selectTradeboxHasExistingPosition = createSelector((q) => !!q(selectTradeboxSelectedPosition));

export const selectTradeboxTradeRatios = createSelector(function selectTradeboxTradeRatios(q) {
  const { isSwap } = q(selectTradeboxTradeFlags);

  if (!isSwap) return {};

  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const triggerRatioValue = q(selectTradeboxTriggerRatioValue);
  const toTokenAddress = q(selectTradeboxToTokenAddress);
  const toToken = q((s) => (toTokenAddress ? selectTokensData(s)?.[toTokenAddress] : undefined));
  const fromToken = q((s) => (fromTokenAddress ? selectTokensData(s)?.[fromTokenAddress] : undefined));
  const fromTokenPrice = fromToken?.prices.minPrice;
  const markPrice = q(selectTradeboxMarkPrice);

  if (!isSwap || !fromToken || !toToken || fromTokenPrice === undefined || markPrice === undefined) {
    return {};
  }

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
});

export const selectTradeboxMarkPrice = createSelector(function selectTradeboxMarkPrice(q) {
  const toTokenAddress = q(selectTradeboxToTokenAddress);
  const toToken = q((s) => (toTokenAddress ? selectTokensData(s)?.[toTokenAddress] : undefined));
  const { isSwap, isIncrease, isLong } = q(selectTradeboxTradeFlags);

  if (!toToken) {
    return undefined;
  }

  if (isSwap) {
    return toToken.prices.minPrice;
  }

  return getMarkPrice({ prices: toToken.prices, isIncrease, isLong });
});

export const selectTradeboxLiquidity = createSelector(function selectTradeboxLiquidity(q) {
  const marketInfo = q(selectTradeboxMarketInfo);
  const { isIncrease, isLong } = q(selectTradeboxTradeFlags);

  if (!marketInfo || !isIncrease) {
    return {};
  }
  const longLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, true);
  const shortLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, false);

  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);

  const isOutPositionLiquidity = isLong
    ? longLiquidity < (increaseAmounts?.sizeDeltaUsd || 0)
    : shortLiquidity < (increaseAmounts?.sizeDeltaUsd || 0);

  return {
    longLiquidity,
    shortLiquidity,
    isOutPositionLiquidity,
  };
});

export const selectTradeboxExecutionPrice = createSelector(function selectTradeboxExecutionPrice(q) {
  const marketInfo = q(selectTradeboxMarketInfo);
  const fees = q(selectTradeboxFees);
  const decreaseAmounts = q(selectTradeboxDecreasePositionAmounts);
  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
  const triggerPrice = q(selectTradeboxTriggerPrice);
  const markPrice = q(selectTradeboxMarkPrice);

  const { isLong, isIncrease, isMarket } = q(selectTradeboxTradeFlags);

  if (!marketInfo) return null;
  if (fees?.positionPriceImpact?.deltaUsd === undefined) return null;

  const nextTriggerPrice = isMarket ? markPrice : triggerPrice;
  const sizeDeltaUsd = isIncrease ? increaseAmounts?.sizeDeltaUsd : decreaseAmounts?.sizeDeltaUsd;

  if (nextTriggerPrice === undefined) return null;
  if (sizeDeltaUsd === undefined) return null;

  return getNextPositionExecutionPrice({
    triggerPrice: nextTriggerPrice,
    priceImpactUsd: fees.positionPriceImpact.deltaUsd,
    sizeDeltaUsd,
    isLong,
    isIncrease,
  });
});

export const selectTradeboxSelectedCollateralTokenSymbol = createSelector((q) => {
  const selectedCollateralAddress = q(selectTradeboxCollateralTokenAddress);
  const tokensData = q(selectTokensData);
  const symbol = tokensData?.[selectedCollateralAddress]?.symbol;

  return symbol;
});

export const selectTradeboxMaxLeverage = createSelector((q) => {
  const minCollateralFactor = q((s) => s.tradebox.marketInfo?.minCollateralFactor);
  return getMaxLeverageByMinCollateralFactor(minCollateralFactor);
});

export const selectTradeboxLeverageSliderMarks = createSelector((q) => {
  const maxAllowedLeverage = q(selectTradeboxMaxLeverage);
  return getTradeboxLeverageSliderMarks(maxAllowedLeverage);
});

export const selectTradeboxMarketsSortMap = createSelector((q) => {
  const { sortedMarketConfigs } = q(selectTradeboxAvailableTokensOptions);

  return sortedMarketConfigs.reduce((acc, market, idx) => {
    acc[market.indexTokenAddress] = idx;
    return acc;
  }, {});
});

export const selectTradeboxToToken = createSelector((q) => {
  const toToken = q(selectTradeboxToTokenAddress);

  return q((state) => getByKey(selectTokensData(state), toToken));
});

export const selectTradeboxFromToken = createSelector((q) => {
  const fromToken = q(selectTradeboxFromTokenAddress);

  return q((state) => getByKey(selectTokensData(state), fromToken));
});

export const selectTradeboxSwapToTokenAddress = createSelector((q) => {
  const { isSwap } = q(selectTradeboxTradeFlags);

  const toTokenAddress = q(selectTradeboxToTokenAddress);

  if (isSwap) {
    return toTokenAddress;
  }

  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);

  return collateralTokenAddress;
});

export const selectTradeboxSelectSwapToToken = createSelector((q) => {
  const tokenAddress = q(selectTradeboxSwapToTokenAddress);

  return q((state) => getByKey(selectTokensData(state), tokenAddress));
});

export const selectTradeboxIsNeedSwap = createSelector((q) => {
  const fromToken = q(selectTradeboxFromToken);
  const collateralToken = q(selectTradeboxCollateralToken);

  return fromToken && collateralToken && !getIsEquivalentTokens(fromToken, collateralToken);
});

export const selectTradeboxExistingPosition = createSelector((q) => {
  const selectedPositionKey = q(selectTradeboxSelectedPositionKey);
  const positionsInfoData = q(selectPositionsInfoData);

  return getByKey(positionsInfoData, selectedPositionKey);
});

export const selectTradeboxCloseSizeUsd = createSelector((q) => {
  const closeSizeInputValue = q(selectTradeboxCloseSizeInputValue);

  return parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;
});

export const selectTradeboxSwapFeesPercentage = createSelector((q) => {
  const swapAmounts = q(selectTradeboxSwapAmounts);

  if (
    swapAmounts === undefined ||
    swapAmounts.swapPathStats?.totalSwapFeeUsd === undefined ||
    swapAmounts.usdIn === undefined ||
    swapAmounts.usdIn === 0n
  ) {
    return 0n;
  }

  return bigMath.mulDiv(swapAmounts.swapPathStats.totalSwapFeeUsd * -1n, PRECISION, swapAmounts.usdIn);
});

export const selectTradeboxPriceImpactPercentage = createSelector((q) => {
  const fees = q(selectTradeboxFees);
  const { isSwap } = q(selectTradeboxTradeFlags);

  if (isSwap) {
    return fees?.swapPriceImpact?.precisePercentage ?? 0n;
  }

  if (fees?.positionPriceImpact?.precisePercentage === undefined) {
    return 0n;
  }

  return fees.positionPriceImpact.precisePercentage;
});

export const selectTradeboxFeesPercentage = createSelector((q) => {
  const { isSwap } = q(selectTradeboxTradeFlags);

  if (isSwap) {
    return q(selectTradeboxSwapFeesPercentage);
  }

  const fees = q(selectTradeboxFees);

  return fees?.positionFee?.precisePercentage ?? 0n;
});

export const selectTradeboxPayAmount = createSelector((q) => {
  const { isSwap, isIncrease } = q(selectTradeboxTradeFlags);
  const isWrapOrUnwrap = q(selectTradeboxIsWrapOrUnwrap);

  if (isSwap && !isWrapOrUnwrap) {
    const swapAmounts = q(selectTradeboxSwapAmounts);
    return swapAmounts?.amountIn;
  }

  if (isIncrease) {
    const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
    return increaseAmounts?.initialCollateralAmount;
  }

  return undefined;
});

export const selectTradeboxPayTokenAllowance = createSelector((q) => {
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const tokensAllowance = q(selectTradeboxTokensAllowance);

  return getByKey(tokensAllowance.tokensAllowanceData, fromTokenAddress);
});

export const selectNeedTradeboxPayTokenApproval = createSelector((q) => {
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const payAmount = q(selectTradeboxPayAmount);
  const tokensAllowance = q(selectTradeboxTokensAllowance);

  return getNeedTokenApprove(tokensAllowance.tokensAllowanceData, fromTokenAddress, payAmount, []);
});

export const selectTradeboxChooseSuitableMarket = createSelector((q) => {
  const getMaxLongShortLiquidityPool = q(selectTradeboxGetMaxLongShortLiquidityPool);
  const tradeType = q(selectTradeboxTradeType);
  const positionsInfo = q(selectPositionsInfoData);
  const ordersInfo = q(selectOrdersInfoData);
  const tokensData = q(selectTokensData);
  const setTradeConfig = q(selectTradeboxSetTradeConfig);

  const chooseSuitableMarketWrapped = (
    tokenAddress: string,
    preferredTradeType?: PreferredTradeTypePickStrategy,
    currentTradeType?: TradeType
  ) => {
    const token = getByKey(tokensData, tokenAddress);

    if (!token) return;

    const { maxLongLiquidityPool, maxShortLiquidityPool } = getMaxLongShortLiquidityPool(token);

    const suitableParams = chooseSuitableMarket({
      indexTokenAddress: tokenAddress,
      maxLongLiquidityPool,
      maxShortLiquidityPool,
      isSwap: tradeType === TradeType.Swap,
      positionsInfo,
      ordersInfo,
      preferredTradeType: preferredTradeType ?? tradeType,
      currentTradeType,
    });

    if (!suitableParams) return;

    setTradeConfig({
      collateralAddress: suitableParams.collateralTokenAddress,
      toTokenAddress: suitableParams.indexTokenAddress,
      marketAddress: suitableParams.marketTokenAddress,
      tradeType: suitableParams.tradeType,
    });

    return suitableParams;
  };

  return chooseSuitableMarketWrapped;
});
