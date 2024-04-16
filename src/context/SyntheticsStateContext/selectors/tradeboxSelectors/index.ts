import { SyntheticsTradeState } from "../../SyntheticsStateContextProvider";
import {
  selectAccount,
  selectOrdersInfoData,
  selectPositionsInfoData,
  selectSavedIsPnlInLeverage,
  selectTokensData,
  selectUiFeeFactor,
} from "../globalSelectors";
import { getByKey } from "lib/objects";
import { parseValue } from "lib/numbers";
import { BigNumber } from "ethers";
import {
  createTradeFlags,
  makeSelectDecreasePositionAmounts,
  makeSelectIncreasePositionAmounts,
  makeSelectNextPositionValuesForDecrease,
  makeSelectNextPositionValuesForIncrease,
  makeSelectSwapRoutes,
  makeSelectTradeRatios,
} from "../tradeSelectors";
import { USD_DECIMALS, getPositionKey } from "lib/legacy";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { createEnhancedSelector, createSelector } from "../../utils";
import { isSwapOrderType } from "domain/synthetics/orders";
import { SwapAmounts, TradeType, getSwapAmountsByFromValue, getSwapAmountsByToValue } from "domain/synthetics/trade";
import { convertToUsd } from "domain/synthetics/tokens";

export * from "./selectTradeboxGetMaxLongShortLiquidityPool";
export * from "./selectTradeboxChooseSuitableMarket";
export * from "./selectTradeboxAvailableMarketOptions";

const selectOnlyOnTradeboxPage = <T>(s: SyntheticsTradeState, selection: T) =>
  s.pageType === "trade" ? selection : undefined;
export const selectTradeboxState = (s: SyntheticsTradeState) => s.tradebox;
export const selectTradeboxTradeType = (s: SyntheticsTradeState) => s.tradebox.tradeType;
export const selectTradeboxTradeMode = (s: SyntheticsTradeState) => s.tradebox.tradeMode;
export const selectTradeboxIsWrapOrUnwrap = (s: SyntheticsTradeState) => s.tradebox.isWrapOrUnwrap;
export const selectTradeboxFromTokenAddress = (s: SyntheticsTradeState) => s.tradebox.fromTokenAddress;
export const selectTradeboxToTokenAddress = (s: SyntheticsTradeState) => s.tradebox.toTokenAddress;
export const selectTradeboxMarketAddress = (s: SyntheticsTradeState) =>
  selectOnlyOnTradeboxPage(s, s.tradebox.marketAddress);
export const selectTradeboxMarketInfo = (s: SyntheticsTradeState) => s.tradebox.marketInfo;
export const selectTradeboxCollateralTokenAddress = (s: SyntheticsTradeState) =>
  selectOnlyOnTradeboxPage(s, s.tradebox.collateralAddress);
export const selectTradeboxCollateralToken = (s: SyntheticsTradeState) => s.tradebox.collateralToken;
export const selectTradeboxAvailableTradeModes = (s: SyntheticsTradeState) => s.tradebox.avaialbleTradeModes;
export const selectTradeboxAvailableTokensOptions = (s: SyntheticsTradeState) => s.tradebox.availableTokensOptions;
export const selectTradeboxFromTokenInputValue = (s: SyntheticsTradeState) => s.tradebox.fromTokenInputValue;
export const selectTradeboxToTokenInputValue = (s: SyntheticsTradeState) => s.tradebox.toTokenInputValue;
export const selectTradeboxStage = (s: SyntheticsTradeState) => s.tradebox.stage;
export const selectTradeboxFocusedInput = (s: SyntheticsTradeState) => s.tradebox.focusedInput;
export const selectTradeboxFixedTriggerThresholdType = (s: SyntheticsTradeState) =>
  s.tradebox.fixedTriggerThresholdType;
export const selectTradeboxFixedTriggerOrderType = (s: SyntheticsTradeState) => s.tradebox.fixedTriggerOrderType;
export const selectTradeboxDefaultTriggerAcceptablePriceImpactBps = (s: SyntheticsTradeState) =>
  s.tradebox.defaultTriggerAcceptablePriceImpactBps;
export const selectTradeboxSelectedTriggerAcceptablePriceImpactBps = (s: SyntheticsTradeState) =>
  s.tradebox.selectedTriggerAcceptablePriceImpactBps;
export const selectTradeboxCloseSizeInputValue = (s: SyntheticsTradeState) => s.tradebox.closeSizeInputValue;
export const selectTradeboxTriggerPriceInputValue = (s: SyntheticsTradeState) => s.tradebox.triggerPriceInputValue;
export const selectTradeboxTriggerRatioInputValue = (s: SyntheticsTradeState) => s.tradebox.triggerRatioInputValue;
export const selectTradeboxLeverageOption = (s: SyntheticsTradeState) => s.tradebox.leverageOption;
export const selectTradeboxIsLeverageEnabled = (s: SyntheticsTradeState) => s.tradebox.isLeverageEnabled;
export const selectTradeboxKeepLeverage = (s: SyntheticsTradeState) => s.tradebox.keepLeverage;
export const selectTradeboxSetActivePosition = (s: SyntheticsTradeState) => s.tradebox.setActivePosition;
export const selectTradeboxSetToTokenAddress = (s: SyntheticsTradeState) => s.tradebox.setToTokenAddress;
export const selectTradeboxSetTradeConfig = (s: SyntheticsTradeState) => s.tradebox.setTradeConfig;
export const selectTradeboxSetCollateralAddress = (s: SyntheticsTradeState) => s.tradebox.setCollateralAddress;

export const selectTradeboxSwapRoutes = createEnhancedSelector((q) => {
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const toTokenAddress = q(selectTradeboxToTokenAddress);
  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
  const tradeMode = q(selectTradeboxTradeMode);
  const tradeType = q(selectTradeboxTradeType);
  const tradeFlags = createTradeFlags(tradeType, tradeMode);

  return q(makeSelectSwapRoutes(fromTokenAddress, tradeFlags.isPosition ? collateralTokenAddress : toTokenAddress));
});

export const selectTradeboxIncreasePositionAmounts = createEnhancedSelector((q) => {
  const tokensData = q(selectTokensData);
  const tradeMode = q(selectTradeboxTradeMode);
  const tradeType = q(selectTradeboxTradeType);
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const fromTokenInputValue = q(selectTradeboxFromTokenInputValue);
  const toTokenAddress = q(selectTradeboxToTokenAddress);
  const toTokenInputValue = q(selectTradeboxToTokenInputValue);
  const marketAddress = q(selectTradeboxMarketAddress);
  const leverageOption = q(selectTradeboxLeverageOption);
  const isLeverageEnabled = q(selectTradeboxIsLeverageEnabled);
  const focusedInput = q(selectTradeboxFocusedInput);
  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
  const selectedTriggerAcceptablePriceImpactBps = q(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
  const triggerPriceInputValue = q(selectTradeboxTriggerPriceInputValue);

  const tradeFlags = createTradeFlags(tradeType, tradeMode);
  const fromToken = fromTokenAddress ? getByKey(tokensData, fromTokenAddress) : undefined;
  const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : BigNumber.from(0);
  const toToken = toTokenAddress ? getByKey(tokensData, toTokenAddress) : undefined;
  const toTokenAmount = toToken ? parseValue(toTokenInputValue || "0", toToken.decimals)! : BigNumber.from(0);
  const leverage = BigNumber.from(parseInt(String(Number(leverageOption!) * BASIS_POINTS_DIVISOR)));
  const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
  const positionKey = q(selectTradeboxSelectedPositionKey);

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
    strategy: isLeverageEnabled ? (focusedInput === "from" ? "leverageByCollateral" : "leverageBySize") : "independent",
    tradeMode,
    tradeType,
    triggerPrice,
    tokenTypeForSwapRoute: tradeFlags.isPosition ? "collateralToken" : "indexToken",
  });

  return q(selector);
});

export const selectTradeboxDecreasePositionAmounts = createEnhancedSelector((q) => {
  const tradeMode = q(selectTradeboxTradeMode);
  const tradeType = q(selectTradeboxTradeType);
  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
  const marketAddress = q(selectTradeboxMarketAddress);
  const triggerPriceInputValue = q(selectTradeboxTriggerPriceInputValue);
  const closeSizeInputValue = q(selectTradeboxCloseSizeInputValue);
  const keepLeverage = q(selectTradeboxKeepLeverage);
  const selectedTriggerAcceptablePriceImpactBps = q(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
  const positionKey = q(selectTradeboxSelectedPositionKey);

  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;
  const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);

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

export const selectTradeboxSwapAmounts = createEnhancedSelector((q) => {
  const tokensData = q(selectTokensData);
  const tradeMode = q(selectTradeboxTradeMode);
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const fromTokenInputValue = q(selectTradeboxFromTokenInputValue);
  const toTokenAddress = q(selectTradeboxToTokenAddress);
  const toTokenInputValue = q(selectTradeboxToTokenInputValue);
  const amountBy = q(selectTradeboxFocusedInput);
  const uiFeeFactor = q(selectUiFeeFactor);
  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);

  const fromToken = fromTokenAddress ? getByKey(tokensData, fromTokenAddress) : undefined;
  const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : BigNumber.from(0);
  const toToken = toTokenAddress ? getByKey(tokensData, toTokenAddress) : undefined;
  const toTokenAmount = toToken ? parseValue(toTokenInputValue || "0", toToken.decimals)! : BigNumber.from(0);
  const tradeFlags = createTradeFlags(TradeType.Swap, tradeMode);
  const isWrapOrUnwrap = q(selectTradeboxIsWrapOrUnwrap);

  const fromTokenPrice = fromToken?.prices.minPrice;

  if (!fromToken || !toToken || !fromTokenPrice) {
    return undefined;
  }

  const { findSwapPath } = q(
    makeSelectSwapRoutes(fromTokenAddress, tradeFlags.isPosition ? collateralTokenAddress : toTokenAddress)
  );
  const triggerRatioInputValue = q(selectTradeboxTriggerRatioInputValue);
  const triggerRatioValue = parseValue(triggerRatioInputValue, USD_DECIMALS);

  const { markRatio, triggerRatio } = q(
    makeSelectTradeRatios({
      fromTokenAddress,
      toTokenAddress,
      tradeMode,
      tradeType: TradeType.Swap,
      triggerRatioValue,
    })
  );

  if (isWrapOrUnwrap) {
    const tokenAmount = amountBy === "from" ? fromTokenAmount : toTokenAmount;
    const usdAmount = convertToUsd(tokenAmount, fromToken.decimals, fromTokenPrice)!;
    const price = fromTokenPrice;

    const swapAmounts: SwapAmounts = {
      amountIn: tokenAmount,
      usdIn: usdAmount!,
      amountOut: tokenAmount,
      usdOut: usdAmount!,
      swapPathStats: undefined,
      priceIn: price,
      priceOut: price,
      minOutputAmount: tokenAmount,
    };

    return swapAmounts;
  } else if (amountBy === "from") {
    return getSwapAmountsByFromValue({
      tokenIn: fromToken,
      tokenOut: toToken,
      amountIn: fromTokenAmount,
      triggerRatio: triggerRatio || markRatio,
      isLimit: tradeFlags.isLimit,
      findSwapPath: findSwapPath,
      uiFeeFactor,
    });
  } else {
    return getSwapAmountsByToValue({
      tokenIn: fromToken,
      tokenOut: toToken,
      amountOut: toTokenAmount,
      triggerRatio: triggerRatio || markRatio,
      isLimit: tradeFlags.isLimit,
      findSwapPath: findSwapPath,
      uiFeeFactor,
    });
  }
});

export const selectTradeboxTradeFlags = createSelector(
  [selectTradeboxTradeType, selectTradeboxTradeMode],
  (tradeType, tradeMode) => {
    const tradeFlags = createTradeFlags(tradeType, tradeMode);
    return tradeFlags;
  }
);

export const selectTradeboxLeverage = createSelector([selectTradeboxLeverageOption], (leverageOption) =>
  BigNumber.from(parseInt(String(Number(leverageOption!) * BASIS_POINTS_DIVISOR)))
);

const selectNextValuesForIncrease = createEnhancedSelector(
  (q): Parameters<typeof makeSelectNextPositionValuesForIncrease>[0] => {
    const tokensData = q(selectTokensData);
    const tradeMode = q(selectTradeboxTradeMode);
    const tradeType = q(selectTradeboxTradeType);
    const fromTokenAddress = q(selectTradeboxFromTokenAddress);
    const fromTokenInputValue = q(selectTradeboxFromTokenInputValue);
    const toTokenAddress = q(selectTradeboxToTokenAddress);
    const toTokenInputValue = q(selectTradeboxToTokenInputValue);
    const marketAddress = q(selectTradeboxMarketAddress);
    const leverageOption = q(selectTradeboxLeverageOption);
    const isLeverageEnabled = q(selectTradeboxIsLeverageEnabled);
    const focusedInput = q(selectTradeboxFocusedInput);
    const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
    const selectedTriggerAcceptablePriceImpactBps = q(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
    const triggerPriceInputValue = q(selectTradeboxTriggerPriceInputValue);
    const positionKey = q(selectTradeboxSelectedPositionKey);

    const tradeFlags = createTradeFlags(tradeType, tradeMode);
    const fromToken = fromTokenAddress ? getByKey(tokensData, fromTokenAddress) : undefined;
    const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : BigNumber.from(0);
    const toToken = toTokenAddress ? getByKey(tokensData, toTokenAddress) : undefined;
    const toTokenAmount = toToken ? parseValue(toTokenInputValue || "0", toToken.decimals)! : BigNumber.from(0);
    const leverage = BigNumber.from(parseInt(String(Number(leverageOption!) * BASIS_POINTS_DIVISOR)));
    const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
    const isPnlInLeverage = q(selectSavedIsPnlInLeverage);

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
      increaseStrategy: isLeverageEnabled
        ? focusedInput === "from"
          ? "leverageByCollateral"
          : "leverageBySize"
        : "independent",
      tradeMode,
      tradeType,
      triggerPrice,
      tokenTypeForSwapRoute: tradeFlags.isPosition ? "collateralToken" : "indexToken",
      isPnlInLeverage,
    };
  }
);

export const selectTradeboxNextPositionValuesForIncrease = createEnhancedSelector((q) => {
  const increaseArgs = q(selectNextValuesForIncrease);

  if (!increaseArgs) return undefined;

  const selector = makeSelectNextPositionValuesForIncrease(increaseArgs);

  return q(selector);
});

const selectTradeboxNextPositionValuesForIncreaseWithoutPnlInLeverage = createEnhancedSelector((q) => {
  const increaseArgs = q(selectNextValuesForIncrease);

  if (!increaseArgs) return undefined;

  const selector = makeSelectNextPositionValuesForIncrease({ ...increaseArgs, isPnlInLeverage: false });

  return q(selector);
});

const selectNextValuesDecreaseArgs = createEnhancedSelector((q) => {
  const tradeMode = q(selectTradeboxTradeMode);
  const tradeType = q(selectTradeboxTradeType);
  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
  const marketAddress = q(selectTradeboxMarketAddress);
  const triggerPriceInputValue = q(selectTradeboxTriggerPriceInputValue);
  const closeSizeInputValue = q(selectTradeboxCloseSizeInputValue);
  const keepLeverage = q(selectTradeboxKeepLeverage);
  const selectedTriggerAcceptablePriceImpactBps = q(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
  const positionKey = q(selectTradeboxSelectedPositionKey);
  const isPnlInLeverage = q(selectSavedIsPnlInLeverage);

  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;
  const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);

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

export const selectTradeboxNextPositionValuesForDecrease = createEnhancedSelector((q) => {
  const decreaseArgs = q(selectNextValuesDecreaseArgs);

  if (!decreaseArgs) return undefined;

  const selector = makeSelectNextPositionValuesForDecrease(decreaseArgs);

  return q(selector);
});

const selectTradeboxNextPositionValuesForDecreaseWithoutPnlInLeverage = createEnhancedSelector((q) => {
  const decreaseArgs = q(selectNextValuesDecreaseArgs);

  if (!decreaseArgs) return undefined;

  const selector = makeSelectNextPositionValuesForDecrease({ ...decreaseArgs, isPnlInLeverage: false });

  return q(selector);
});

export const selectTradeboxNextLeverageWithoutPnl = createEnhancedSelector((q) => {
  const tradeFlags = q(selectTradeboxTradeFlags);
  const nextValues = tradeFlags.isIncrease
    ? q(selectTradeboxNextPositionValuesForIncreaseWithoutPnlInLeverage)
    : q(selectTradeboxNextPositionValuesForDecreaseWithoutPnlInLeverage);

  return nextValues?.nextLeverage;
});

export const selectTradeboxNextPositionValues = createEnhancedSelector((q) => {
  const { isIncrease } = q(selectTradeboxTradeFlags);
  return isIncrease ? q(selectTradeboxNextPositionValuesForIncrease) : q(selectTradeboxNextPositionValuesForDecrease);
});

export const selectTradeboxSelectedPositionKey = createSelector(
  [selectAccount, selectTradeboxCollateralTokenAddress, selectTradeboxMarketAddress, selectTradeboxTradeFlags],
  (account, collateralAddress, marketAddress, tradeFlags) => {
    if (!account || !collateralAddress || !marketAddress) {
      return undefined;
    }

    return getPositionKey(account, marketAddress, collateralAddress, tradeFlags.isLong);
  }
);

export const selectTradeboxSelectedPosition = createSelector(
  [selectTradeboxSelectedPositionKey, selectPositionsInfoData],
  (selectedPositionKey, positionsInfoData) => getByKey(positionsInfoData, selectedPositionKey)
);

export const selectTradeboxExistingOrder = createSelector(
  [selectTradeboxSelectedPositionKey, selectOrdersInfoData],
  (selectedPositionKey, ordersInfoData) => {
    if (!selectedPositionKey) {
      return undefined;
    }

    return Object.values(ordersInfoData || {})
      .filter((order) => !isSwapOrderType(order.orderType))
      .find((order) => {
        if (isSwapOrderType(order.orderType)) {
          return false;
        }

        return (
          getPositionKey(order.account, order.marketAddress, order.targetCollateralToken.address, order.isLong) ===
          selectedPositionKey
        );
      });
  }
);
