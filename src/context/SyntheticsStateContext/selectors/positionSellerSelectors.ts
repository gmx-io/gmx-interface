import { TradeMode, TradeType } from "domain/synthetics/trade/types";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { USD_DECIMALS } from "lib/legacy";
import { parseValue } from "lib/numbers";
import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector } from "../utils";
import {
  selectClosingPositionKey,
  selectPositionsInfoData,
  selectTokensData,
  selectUiFeeFactor,
} from "./globalSelectors";
import {
  makeSelectDecreasePositionAmounts,
  makeSelectFindSwapPath,
  makeSelectMaxLiquidityPath,
  makeSelectNextPositionValuesForDecrease,
} from "./tradeSelectors";
import {
  getMinCollateralFactorForPosition,
  willPositionCollateralBeSufficientForPosition,
} from "domain/synthetics/positions";
import { selectIsPnlInLeverage } from "./settingsSelectors";
import { applySlippageToPrice, getSwapAmountsByFromValue } from "domain/synthetics/trade";
import { mustNeverExist } from "lib/types";
import { getByKey } from "lib/objects";
import { getIsEquivalentTokens } from "domain/tokens";

export const selectPositionSeller = (state: SyntheticsState) => state.positionSeller;
export const selectPositionSellerOrderOption = (state: SyntheticsState) => state.positionSeller.orderOption;
export const selectPositionSellerTriggerPriceInputValue = (state: SyntheticsState) =>
  state.positionSeller.triggerPriceInputValue;
export const selectPositionSellerKeepLeverageRaw = (state: SyntheticsState) => state.positionSeller.keepLeverage;
export const selectPositionSellerSelectedTriggerAcceptablePriceImpactBps = (state: SyntheticsState) =>
  state.positionSeller.selectedTriggerAcceptablePriceImpactBps;
export const selectPositionSellerCloseUsdInputValue = (state: SyntheticsState) =>
  state.positionSeller.closeUsdInputValue;
const selectPositionSellerReceiveTokenAddress = (state: SyntheticsState) => state.positionSeller.receiveTokenAddress;
export const selectPositionSellerAllowedSlippage = (state: SyntheticsState) => state.positionSeller.allowedSlippage;
export const selectPositionSellerReceiveTokenAddressChanged = (state: SyntheticsState) =>
  state.positionSeller.isReceiveTokenChanged;
export const selectPositionSellerPosition = createSelector((q) => {
  const positionKey = q(selectClosingPositionKey);
  return q((s) => (positionKey ? selectPositionsInfoData(s)?.[positionKey] : undefined));
});

export const selectPositionSellerSetDefaultReceiveToken = (state: SyntheticsState) =>
  state.positionSeller.setDefaultReceiveToken;
export const selectPositionSellerDefaultReceiveToken = (state: SyntheticsState) =>
  state.positionSeller.defaultReceiveToken;

export const selectPositionSellerNextPositionValuesForDecrease = createSelector((q) => {
  const decreaseAmountArgs = q(selectPositionSellerDecreaseAmountArgs);
  const keepLeverageRaw = q(selectPositionSellerKeepLeverageRaw);
  const keepLeverageDisabledByCollateral = q(selectPositionSellerLeverageDisabledByCollateral);
  const keepLeverage = keepLeverageDisabledByCollateral ? false : keepLeverageRaw;

  if (!decreaseAmountArgs) return undefined;

  const selector = makeSelectNextPositionValuesForDecrease({ ...decreaseAmountArgs, keepLeverage });
  return q(selector);
});

const selectPositionSellerDecreaseAmountArgs = createSelector((q) => {
  const position = q(selectPositionSellerPosition);

  if (!position) return undefined;

  const selectedTriggerAcceptablePriceImpactBps = q(selectPositionSellerSelectedTriggerAcceptablePriceImpactBps);
  const positionKey = q(selectClosingPositionKey);
  const orderOption = q(selectPositionSellerOrderOption);
  const tradeType = position.isLong ? TradeType.Long : TradeType.Short;
  const collateralTokenAddress = position.collateralTokenAddress;
  const marketAddress = position.marketInfo.marketTokenAddress;
  const triggerPriceInputValue = q(selectPositionSellerTriggerPriceInputValue);
  const closeSizeInputValue = q(selectPositionSellerCloseUsdInputValue);
  const receiveTokenAddress = q(selectPositionSellerReceiveToken)?.address;

  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;
  const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
  const isPnlInLeverage = q(selectIsPnlInLeverage);

  return {
    collateralTokenAddress,
    fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
    marketAddress,
    positionKey,
    tradeMode: orderOption === OrderOption.Market ? TradeMode.Market : TradeMode.Trigger,
    tradeType,
    triggerPrice,
    closeSizeUsd,
    isPnlInLeverage,
    receiveTokenAddress,
  };
});

export const selectPositionSellerDecreaseAmounts = createSelector((q) => {
  const decreaseAmountArgs = q(selectPositionSellerDecreaseAmountArgs);
  const keepLeverageRaw = q(selectPositionSellerKeepLeverageRaw);
  const keepLeverageDisabledByCollateral = q(selectPositionSellerLeverageDisabledByCollateral);
  const keepLeverage = keepLeverageDisabledByCollateral ? false : keepLeverageRaw;

  if (!decreaseAmountArgs) return undefined;

  const selector = makeSelectDecreasePositionAmounts({ ...decreaseAmountArgs, keepLeverage });

  return q(selector);
});

const selectPositionSellerDecreaseAmountsWithKeepLeverage = createSelector((q) => {
  const decreaseAmountArgs = q(selectPositionSellerDecreaseAmountArgs);

  if (!decreaseAmountArgs) return undefined;

  const selector = makeSelectDecreasePositionAmounts({ ...decreaseAmountArgs, keepLeverage: true });

  return q(selector);
});

export const selectPositionSellerKeepLeverage = createSelector((q) => {
  const position = q(selectPositionSellerPosition);

  if (!position) return false;

  const keepLeverage = q(selectPositionSellerKeepLeverageRaw);

  if (!keepLeverage) return false;

  const disabledByCollateral = q(selectPositionSellerLeverageDisabledByCollateral);

  return !disabledByCollateral;
});

export const selectPositionSellerLeverageDisabledByCollateral = createSelector((q) => {
  const position = q(selectPositionSellerPosition);

  if (!position) return false;

  const decreaseAmountsWithKeepLeverage = q(selectPositionSellerDecreaseAmountsWithKeepLeverage);

  if (!decreaseAmountsWithKeepLeverage) return false;

  if (decreaseAmountsWithKeepLeverage.sizeDeltaUsd >= position.sizeInUsd) return false;

  const minCollateralFactor = getMinCollateralFactorForPosition(
    position,
    -decreaseAmountsWithKeepLeverage.sizeDeltaUsd
  );

  if (minCollateralFactor === undefined) return false;

  return !willPositionCollateralBeSufficientForPosition(
    position,
    decreaseAmountsWithKeepLeverage.collateralDeltaAmount,
    decreaseAmountsWithKeepLeverage.realizedPnl,
    minCollateralFactor,
    -decreaseAmountsWithKeepLeverage.sizeDeltaUsd
  );
});

export const selectPositionSellerAcceptablePrice = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const decreaseAmounts = q(selectPositionSellerDecreaseAmounts);

  if (!position || decreaseAmounts?.acceptablePrice === undefined) {
    return undefined;
  }

  const orderOption = q(selectPositionSellerOrderOption);
  const allowedSlippage = q(selectPositionSellerAllowedSlippage);

  if (orderOption === OrderOption.Market) {
    return applySlippageToPrice(allowedSlippage, decreaseAmounts.acceptablePrice, false, position.isLong);
  } else if (orderOption === OrderOption.Trigger) {
    return decreaseAmounts.acceptablePrice;
  } else {
    mustNeverExist(orderOption);
  }
});

export const selectPositionSellerReceiveToken = createSelector((q) => {
  const orderOption = q(selectPositionSellerOrderOption);
  const position = q(selectPositionSellerPosition);
  const isTrigger = orderOption === OrderOption.Trigger;
  const tokensData = q(selectTokensData);
  const isChanged = q(selectPositionSellerReceiveTokenAddressChanged);
  const defaultReceiveTokenAddress = q(selectPositionSellerDefaultReceiveToken);
  const receiveTokenAddress = isChanged
    ? q(selectPositionSellerReceiveTokenAddress)
    : defaultReceiveTokenAddress ?? q(selectPositionSellerReceiveTokenAddress);
  return isTrigger ? position?.collateralToken : getByKey(tokensData, receiveTokenAddress);
});

export const selectPositionSellerShouldSwap = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const receiveToken = q(selectPositionSellerReceiveToken);

  return position && receiveToken && !getIsEquivalentTokens(position.collateralToken, receiveToken);
});

export const selectPositionSellerMaxLiquidityPath = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const receiveTokenAddress = q(selectPositionSellerReceiveToken)?.address;
  const selectMakeLiquidityPath = makeSelectMaxLiquidityPath(position?.collateralTokenAddress, receiveTokenAddress);

  return q(selectMakeLiquidityPath);
});

export const selectPositionSellerFindSwapPath = createSelector((q) => {
  const position = q(selectPositionSellerPosition);
  const receiveTokenAddress = q(selectPositionSellerReceiveToken)?.address;
  const selectFindSwapPath = makeSelectFindSwapPath(position?.collateralTokenAddress, receiveTokenAddress);

  return q(selectFindSwapPath);
});

export const selectPositionSellerSwapAmounts = createSelector((q) => {
  const position = q(selectPositionSellerPosition);

  if (!position) {
    return undefined;
  }

  const shouldSwap = q(selectPositionSellerShouldSwap);
  const receiveToken = q(selectPositionSellerReceiveToken);
  const decreaseAmounts = q(selectPositionSellerDecreaseAmounts);
  const uiFeeFactor = q(selectUiFeeFactor);

  if (!shouldSwap || !receiveToken || decreaseAmounts?.receiveTokenAmount === undefined) {
    return undefined;
  }

  const findSwapPath = q(selectPositionSellerFindSwapPath);

  return getSwapAmountsByFromValue({
    tokenIn: position.collateralToken,
    tokenOut: receiveToken,
    amountIn: decreaseAmounts.receiveTokenAmount,
    isLimit: false,
    findSwapPath,
    uiFeeFactor,
  });
});
