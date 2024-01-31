import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { selectAccount, selectOrdersInfoData, selectPositionsInfoData, selectTokensData } from "./globalSelectors";
import { getByKey } from "lib/objects";
import { parseValue } from "lib/numbers";
import { BigNumber } from "ethers";
import {
  createTradeFlags,
  makeSelectDecreasePositionAmounts,
  makeSelectIncreasePositionAmounts,
  makeSelectNextPositionValues,
  makeSelectSwapAmounts,
} from "./tradeSelectors";
import { USD_DECIMALS, getPositionKey } from "lib/legacy";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { createSelector } from "../utils";
import { isSwapOrderType } from "domain/synthetics/orders";

export const selectTradeboxState = (s: SyntheticsState) => s.tradebox;
export const selectTradeboxTradeType = (s: SyntheticsState) => s.tradebox.tradeType;
export const selectTradeboxTradeMode = (s: SyntheticsState) => s.tradebox.tradeMode;
export const selectTradeboxIsWrapOrUnwrap = (s: SyntheticsState) => s.tradebox.isWrapOrUnwrap;
export const selectTradeboxFromTokenAddress = (s: SyntheticsState) => s.tradebox.fromTokenAddress;
export const selectTradeboxToTokenAddress = (s: SyntheticsState) => s.tradebox.toTokenAddress;
export const selectTradeboxMarketAddress = (s: SyntheticsState) => s.tradebox.marketAddress;
export const selectTradeboxMarketInfo = (s: SyntheticsState) => s.tradebox.marketInfo;
export const selectTradeboxCollateralTokenAddress = (s: SyntheticsState) => s.tradebox.collateralAddress;
export const selectTradeboxCollateralToken = (s: SyntheticsState) => s.tradebox.collateralToken;
export const selectTradeboxAvailableTradeModes = (s: SyntheticsState) => s.tradebox.avaialbleTradeModes;
export const selectTradeboxAvailableTokensOptions = (s: SyntheticsState) => s.tradebox.availableTokensOptions;
export const selectTradeboxFromTokenInputValue = (s: SyntheticsState) => s.tradebox.fromTokenInputValue;
export const selectTradeboxToTokenInputValue = (s: SyntheticsState) => s.tradebox.toTokenInputValue;
export const selectTradeboxStage = (s: SyntheticsState) => s.tradebox.stage;
export const selectTradeboxFocusedInput = (s: SyntheticsState) => s.tradebox.focusedInput;
export const selectTradeboxFixedTriggerThresholdType = (s: SyntheticsState) => s.tradebox.fixedTriggerThresholdType;
export const selectTradeboxFixedTriggerOrderType = (s: SyntheticsState) => s.tradebox.fixedTriggerOrderType;
export const selectTradeboxDefaultTriggerAcceptablePriceImpactBps = (s: SyntheticsState) =>
  s.tradebox.defaultTriggerAcceptablePriceImpactBps;
export const selectTradeboxSelectedTriggerAcceptablePriceImpactBps = (s: SyntheticsState) =>
  s.tradebox.selectedTriggerAcceptablePriceImpactBps;
export const selectTradeboxCloseSizeInputValue = (s: SyntheticsState) => s.tradebox.closeSizeInputValue;
export const selectTradeboxTriggerPriceInputValue = (s: SyntheticsState) => s.tradebox.triggerPriceInputValue;
export const selectTradeboxTriggerRatioInputValue = (s: SyntheticsState) => s.tradebox.triggerRatioInputValue;
export const selectTradeboxLeverageOption = (s: SyntheticsState) => s.tradebox.leverageOption;
export const selectTradeboxIsLeverageEnabled = (s: SyntheticsState) => s.tradebox.isLeverageEnabled;
export const selectTradeboxKeepLeverage = (s: SyntheticsState) => s.tradebox.keepLeverage;
export const selectTradeboxSetActivePosition = (s: SyntheticsState) => s.tradebox.setActivePosition;
export const selectTradeboxSetToTokenAddress = (s: SyntheticsState) => s.tradebox.setToTokenAddress;

export const makeSelectTradeboxIncreasePositionAmounts = createSelector(
  [
    selectTokensData,
    selectTradeboxTradeMode,
    selectTradeboxTradeType,
    selectTradeboxFromTokenAddress,
    selectTradeboxFromTokenInputValue,
    selectTradeboxToTokenAddress,
    selectTradeboxToTokenInputValue,
    selectTradeboxMarketAddress,
    selectTradeboxLeverageOption,
    selectTradeboxIsLeverageEnabled,
    selectTradeboxFocusedInput,
    selectTradeboxCollateralTokenAddress,
    selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
    selectTradeboxTriggerPriceInputValue,
  ],
  (
    tokensData,
    tradeMode,
    tradeType,
    fromTokenAddress,
    fromTokenInputValue,
    toTokenAddress,
    toTokenInputValue,
    marketAddress,
    leverageOption,
    isLeverageEnabled,
    focusedInput,
    collateralTokenAddress,
    selectedTriggerAcceptablePriceImpactBps,
    triggerPriceInputValue
  ) => {
    const fromToken = fromTokenAddress ? getByKey(tokensData, fromTokenAddress) : undefined;
    const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : BigNumber.from(0);
    const toToken = toTokenAddress ? getByKey(tokensData, toTokenAddress) : undefined;
    const toTokenAmount = toToken ? parseValue(toTokenInputValue || "0", toToken.decimals)! : BigNumber.from(0);
    const leverage = BigNumber.from(parseInt(String(Number(leverageOption!) * BASIS_POINTS_DIVISOR)));
    const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
    const selector = makeSelectIncreasePositionAmounts({
      collateralTokenAddress,
      fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
      indexTokenAddress: toTokenAddress,
      indexTokenAmount: toTokenAmount,
      initialCollateralAmount: fromTokenAmount,
      initialCollateralTokenAddress: fromTokenAddress,
      leverage,
      marketAddress,
      positionKey: undefined,
      strategy: isLeverageEnabled
        ? focusedInput === "from"
          ? "leverageByCollateral"
          : "leverageBySize"
        : "independent",
      tradeMode,
      tradeType,
      triggerPrice,
    });

    return (s: SyntheticsState) => selector(s);
  }
);

export const makeSelectTradeboxDecreasePositionAmounts = createSelector(
  [
    selectTradeboxTradeMode,
    selectTradeboxTradeType,
    selectTradeboxCollateralTokenAddress,
    selectTradeboxMarketAddress,
    selectTradeboxTriggerPriceInputValue,
    selectTradeboxCloseSizeInputValue,
    selectTradeboxKeepLeverage,
    selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  ],
  (
    tradeMode,
    tradeType,
    collateralTokenAddress,
    marketAddress,
    triggerPriceInputValue,
    closeSizeInputValue,
    keepLeverage,
    selectedTriggerAcceptablePriceImpactBps
  ) => {
    const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;
    const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);

    if (typeof keepLeverage === "undefined")
      throw new Error("selectTradeboxDecreasePositionAmounts: keepLeverage is undefined");

    const selector = makeSelectDecreasePositionAmounts({
      collateralTokenAddress: collateralTokenAddress,
      fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
      marketAddress,
      positionKey: undefined,
      tradeMode,
      tradeType,
      triggerPrice,
      closeSizeUsd,
      keepLeverage,
    });

    return (s: SyntheticsState) => selector(s);
  }
);

export const makeSelectTradeboxSwapAmounts = createSelector(
  [
    selectTokensData,
    selectTradeboxTradeMode,
    selectTradeboxFromTokenAddress,
    selectTradeboxFromTokenInputValue,
    selectTradeboxToTokenAddress,
    selectTradeboxToTokenInputValue,
    selectTradeboxTriggerRatioInputValue,
    selectTradeboxFocusedInput,
  ],
  (
    tokensData,
    tradeMode,
    fromTokenAddress,
    fromTokenInputValue,
    toTokenAddress,
    toTokenInputValue,
    triggerRatioInputValue,
    amountBy
  ) => {
    const fromToken = fromTokenAddress ? getByKey(tokensData, fromTokenAddress) : undefined;
    const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : BigNumber.from(0);
    const toToken = toTokenAddress ? getByKey(tokensData, toTokenAddress) : undefined;
    const toTokenAmount = toToken ? parseValue(toTokenInputValue || "0", toToken.decimals)! : BigNumber.from(0);
    const triggerRatioValue = parseValue(triggerRatioInputValue, USD_DECIMALS);
    const selector = makeSelectSwapAmounts({
      amountBy,
      fromTokenAddress,
      fromTokenAmount,
      isWrapOrUnwrap: false,
      toTokenAddress,
      toTokenAmount,
      tradeMode,
      triggerRatioValue,
    });

    return (s: SyntheticsState) => selector(s);
  }
);

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

export const makeSelectTradeboxNextPositionValues = createSelector(
  [
    selectTokensData,
    selectTradeboxTradeMode,
    selectTradeboxTradeType,
    selectTradeboxFromTokenAddress,
    selectTradeboxFromTokenInputValue,
    selectTradeboxToTokenAddress,
    selectTradeboxToTokenInputValue,
    selectTradeboxMarketAddress,
    selectTradeboxLeverage,
    selectTradeboxIsLeverageEnabled,
    selectTradeboxFocusedInput,
    selectTradeboxCollateralTokenAddress,
    selectTradeboxTriggerPriceInputValue,
    selectTradeboxCloseSizeInputValue,
    selectTradeboxKeepLeverage,
    selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  ],
  (
    tokensData,
    tradeMode,
    tradeType,
    fromTokenAddress,
    fromTokenInputValue,
    toTokenAddress,
    toTokenInputValue,
    marketAddress,
    leverage,
    isLeverageEnabled,
    focusedInput,
    collateralTokenAddress,
    triggerPriceInputValue,
    closeSizeInputValue,
    keepLeverage,
    selectedTriggerAcceptablePriceImpactBps
  ) => {
    const fromToken = fromTokenAddress ? getByKey(tokensData, fromTokenAddress) : undefined;
    const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : BigNumber.from(0);
    const toToken = toTokenAddress ? getByKey(tokensData, toTokenAddress) : undefined;
    const toTokenAmount = toToken ? parseValue(toTokenInputValue || "0", toToken.decimals)! : BigNumber.from(0);
    const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
    const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;

    return makeSelectNextPositionValues({
      collateralTokenAddress,
      fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
      indexTokenAddress: toTokenAddress,
      indexTokenAmount: toTokenAmount,
      initialCollateralAmount: fromTokenAmount,
      initialCollateralTokenAddress: fromTokenAddress,
      leverage,
      marketAddress,
      positionKey: undefined,
      increaseStrategy: isLeverageEnabled
        ? focusedInput === "from"
          ? "leverageByCollateral"
          : "leverageBySize"
        : "independent",
      tradeMode,
      tradeType,
      triggerPrice,
      closeSizeUsd,
      keepLeverage,
    });
  }
);

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
