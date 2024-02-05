import { SyntheticsTradeState } from "../SyntheticsStateContextProvider";
import { selectAccount, selectOrdersInfoData, selectPositionsInfoData, selectTokensData } from "./globalSelectors";
import { getByKey } from "lib/objects";
import { parseValue } from "lib/numbers";
import { BigNumber } from "ethers";
import {
  createTradeFlags,
  makeSelectDecreasePositionAmounts,
  makeSelectIncreasePositionAmounts,
  makeSelectNextPositionValuesForDecrease,
  makeSelectNextPositionValuesForIncrease,
  makeSelectSwapAmounts,
} from "./tradeSelectors";
import { USD_DECIMALS, getPositionKey } from "lib/legacy";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { createSelector } from "../utils";
import { isSwapOrderType } from "domain/synthetics/orders";

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

    return (s: SyntheticsTradeState) => selector(s);
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

    return (s: SyntheticsTradeState) => selector(s);
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

    return (s: SyntheticsTradeState) => selector(s);
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

export const makeSelectTradeboxNextPositionValuesForIncrease = createSelector(
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
    selectedTriggerAcceptablePriceImpactBps
  ) => {
    const fromToken = fromTokenAddress ? getByKey(tokensData, fromTokenAddress) : undefined;
    const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : BigNumber.from(0);
    const toToken = toTokenAddress ? getByKey(tokensData, toTokenAddress) : undefined;
    const toTokenAmount = toToken ? parseValue(toTokenInputValue || "0", toToken.decimals)! : BigNumber.from(0);
    const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);

    return makeSelectNextPositionValuesForIncrease({
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
    });
  }
);

export const makeSelectTradeboxNextPositionValuesForDecrease = createSelector(
  [
    selectTradeboxTradeMode,
    selectTradeboxTradeType,
    selectTradeboxMarketAddress,
    selectTradeboxCollateralTokenAddress,
    selectTradeboxTriggerPriceInputValue,
    selectTradeboxCloseSizeInputValue,
    selectTradeboxKeepLeverage,
    selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  ],
  (
    tradeMode,
    tradeType,
    marketAddress,
    collateralTokenAddress,
    triggerPriceInputValue,
    closeSizeInputValue,
    keepLeverage,
    selectedTriggerAcceptablePriceImpactBps
  ) => {
    const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
    const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;

    return makeSelectNextPositionValuesForDecrease({
      collateralTokenAddress,
      fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
      marketAddress,
      positionKey: undefined,
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
