import { TradeMode, TradeType } from "domain/synthetics/trade/types";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { USD_DECIMALS } from "lib/legacy";
import { parseValue } from "lib/numbers";
import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector } from "../utils";
import { selectClosingPositionKey, selectPositionsInfoData } from "./globalSelectors";
import { makeSelectDecreasePositionAmounts, makeSelectNextPositionValuesForDecrease } from "./tradeSelectors";
import {
  getMinCollateralFactorForPosition,
  willPositionCollateralBeSufficientForPosition,
} from "domain/synthetics/positions";
import { selectIsPnlInLeverage } from "./settingsSelectors";

export const selectPositionSeller = (state: SyntheticsState) => state.positionSeller;

export const selectPositionSellerOrderOption = (state: SyntheticsState) => state.positionSeller.orderOption;
export const selectPositionSellerTriggerPriceInputValue = (state: SyntheticsState) =>
  state.positionSeller.triggerPriceInputValue;
export const selectPositionSellerKeepLeverageRaw = (state: SyntheticsState) => state.positionSeller.keepLeverage;
export const selectPositionSellerDefaultTriggerAcceptablePriceImpactBps = (state: SyntheticsState) =>
  state.positionSeller.defaultTriggerAcceptablePriceImpactBps;
export const selectPositionSellerSelectedTriggerAcceptablePriceImpactBps = (state: SyntheticsState) =>
  state.positionSeller.selectedTriggerAcceptablePriceImpactBps;
export const selectPositionSellerCloseUsdInputValue = (state: SyntheticsState) =>
  state.positionSeller.closeUsdInputValue;
export const selectPositionSellerReceiveTokenAddress = (state: SyntheticsState) =>
  state.positionSeller.receiveTokenAddress;
export const selectPositionSellerAllowedSlippage = (state: SyntheticsState) => state.positionSeller.allowedSlippage;
export const selectPositionSellerIsSubmitting = (state: SyntheticsState) => state.positionSeller.isSubmitting;
export const selectPositionSellerPosition = createSelector((q) => {
  const positionKey = q(selectClosingPositionKey);
  return q((s) => (positionKey ? selectPositionsInfoData(s)?.[positionKey] : undefined));
});

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

// temporary not used
export const selectPositionSellerDecreaseAmountsWithKeepLeverage = createSelector((q) => {
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

  if (decreaseAmountsWithKeepLeverage.sizeDeltaUsd.gte(position.sizeInUsd)) return false;

  const minCollateralFactor = getMinCollateralFactorForPosition(
    position,
    decreaseAmountsWithKeepLeverage.sizeDeltaUsd.mul(-1)
  );

  if (!minCollateralFactor) return false;

  return !willPositionCollateralBeSufficientForPosition(
    position,
    decreaseAmountsWithKeepLeverage.collateralDeltaAmount,
    decreaseAmountsWithKeepLeverage.realizedPnl,
    minCollateralFactor,
    decreaseAmountsWithKeepLeverage.sizeDeltaUsd.mul(-1)
  );
});
