import {
  OrderType,
  PositionOrderInfo,
  SwapOrderInfo,
  isLimitOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
  sortPositionOrders,
  sortSwapOrders,
} from "domain/synthetics/orders";
import { convertToTokenAmount, getTokenData } from "domain/synthetics/tokens";
import { TradeMode, TradeType, getDecreasePositionAmounts } from "domain/synthetics/trade";
import { BigNumber } from "ethers";
import { USD_DECIMALS, getPositionKey } from "lib/legacy";
import { parseValue } from "lib/numbers";
import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector } from "../utils";
import {
  selectKeepLeverage,
  selectMarketsInfoData,
  selectOrdersInfoData,
  selectPositionConstants,
  selectPositionsInfoData,
  selectTokensData,
  selectUiFeeFactor,
  selectUserReferralInfo,
} from "./globalSelectors";
import { selectIsPnlInLeverage, selectSavedAcceptablePriceImpactBuffer } from "./settingsSelectors";
import { makeSelectNextPositionValuesForIncrease } from "./tradeSelectors";
import { selectTradeboxAvailableTokensOptions } from "./tradeboxSelectors";

export const selectCancellingOrdersKeys = (s: SyntheticsState) => s.orderEditor.cancellingOrdersKeys;
export const selectSetCancellingOrdersKeys = (s: SyntheticsState) => s.orderEditor.setCancellingOrdersKeys;
export const selectEditingOrderKey = (s: SyntheticsState) => s.orderEditor.editingOrderKey;
export const selectSetEditingOrderKey = (s: SyntheticsState) => s.orderEditor.setEditingOrderKey;

export const selectOrderEditorSizeInputValue = (s: SyntheticsState) => s.orderEditor.sizeInputValue;
export const selectOrderEditorSetSizeInputValue = (s: SyntheticsState) => s.orderEditor.setSizeInputValue;
export const selectOrderEditorTriggerPriceInputValue = (s: SyntheticsState) => s.orderEditor.triggerPriceInputValue;
export const selectOrderEditorSetTriggerPriceInputValue = (s: SyntheticsState) =>
  s.orderEditor.setTriggerPriceInputValue;
export const selectOrderEditorTriggerRatioInputValue = (s: SyntheticsState) => s.orderEditor.triggerRatioInputValue;
export const selectOrderEditorSetTriggerRatioInputValue = (s: SyntheticsState) =>
  s.orderEditor.setTriggerRatioInputValue;

export const selectOrderEditorAcceptablePrice = (s: SyntheticsState) => s.orderEditor.acceptablePrice;
export const selectOrderEditorAcceptablePriceImpactBps = (s: SyntheticsState) => s.orderEditor.acceptablePriceImpactBps;
export const selectOrderEditorInitialAcceptablePriceImpactBps = (s: SyntheticsState) =>
  s.orderEditor.initialAcceptablePriceImpactBps;
export const selectOrderEditorSetAcceptablePriceImpactBps = (s: SyntheticsState) =>
  s.orderEditor.setAcceptablePriceImpactBps;

export const selectOrderEditorSizeDeltaUsd = createSelector((q) => {
  return parseValue(q(selectOrderEditorSizeInputValue) || "0", USD_DECIMALS);
});

export const selectOrderEditorTriggerPrice = createSelector((q) => {
  return parseValue(q(selectOrderEditorTriggerPriceInputValue) || "0", USD_DECIMALS);
});

export const selectOrdersList = createSelector((q) => {
  const ordersData = q(selectOrdersInfoData);
  const { sortedIndexTokensWithPoolValue, sortedLongAndShortTokens } = q(selectTradeboxAvailableTokensOptions);

  const { swapOrders, positionOrders } = Object.values(ordersData || {}).reduce(
    (acc, order) => {
      if (isLimitOrderType(order.orderType) || isTriggerDecreaseOrderType(order.orderType)) {
        if (isSwapOrderType(order.orderType)) {
          acc.swapOrders.push(order);
        } else {
          acc.positionOrders.push(order as PositionOrderInfo);
        }
      }
      return acc;
    },
    { swapOrders: [] as SwapOrderInfo[], positionOrders: [] as PositionOrderInfo[] }
  );

  return [
    ...sortPositionOrders(positionOrders, sortedIndexTokensWithPoolValue),
    ...sortSwapOrders(swapOrders, sortedLongAndShortTokens),
  ];
});

export const selectEditingOrder = createSelector((q) => {
  const editingOrderKey = q(selectEditingOrderKey);
  const orders = q(selectOrdersList);

  return orders.find((o) => o.key === editingOrderKey);
});

export const selectOrderEditorPositionKey = createSelector((q) => {
  const order = q(selectEditingOrder);

  if (!order) return;

  return getPositionKey(order.account, order.marketAddress, order.targetCollateralToken.address, order.isLong);
});

export const selectOrderEditorExistingPosition = createSelector((q) => {
  const positionKey = q(selectOrderEditorPositionKey);

  if (!positionKey) return undefined;

  return q((s) => selectPositionsInfoData(s)?.[positionKey]);
});

const selectOrderEditorNextPositionValuesForIncreaseArgs = createSelector((q) => {
  const order = q(selectEditingOrder);

  if (!order) return undefined;

  const sizeDeltaUsd = q(selectOrderEditorSizeDeltaUsd);
  const triggerPrice = q(selectOrderEditorTriggerPrice);

  const positionOrder = order as PositionOrderInfo | undefined;
  const positionIndexToken = positionOrder?.indexToken;
  const indexTokenAmount = positionIndexToken
    ? convertToTokenAmount(sizeDeltaUsd, positionIndexToken.decimals, triggerPrice)
    : undefined;
  const tokensData = q(selectTokensData);
  const fromToken = getTokenData(tokensData, order.initialCollateralTokenAddress);
  const existingPosition = q(selectOrderEditorExistingPosition);

  // useNextPositionValuesForIncrease;
  const isPnlInLeverage = q(selectIsPnlInLeverage);

  return {
    collateralTokenAddress: positionOrder?.targetCollateralToken.address,
    fixedAcceptablePriceImpactBps: undefined,
    indexTokenAddress: positionIndexToken?.address,
    indexTokenAmount,
    initialCollateralAmount: positionOrder?.initialCollateralDeltaAmount ?? BigNumber.from(0),
    initialCollateralTokenAddress: fromToken?.address,
    leverage: existingPosition?.leverage,
    marketAddress: positionOrder?.marketAddress,
    positionKey: existingPosition?.key,
    increaseStrategy: "independent",
    tradeMode: isLimitOrderType(order.orderType) ? TradeMode.Limit : TradeMode.Trigger,
    tradeType: positionOrder?.isLong ? TradeType.Long : TradeType.Short,
    triggerPrice: isLimitOrderType(order.orderType) ? triggerPrice : undefined,
    tokenTypeForSwapRoute: existingPosition ? "collateralToken" : "indexToken",
    isPnlInLeverage,
  } as const;
});

export const selectOrderEditorNextPositionValuesForIncrease = createSelector((q) => {
  const args = q(selectOrderEditorNextPositionValuesForIncreaseArgs);

  if (!args) return undefined;

  const selector = makeSelectNextPositionValuesForIncrease(args);

  return q(selector);
});

export const selectOrderEditorNextPositionValuesWithoutPnlForIncrease = createSelector((q) => {
  const args = q(selectOrderEditorNextPositionValuesForIncreaseArgs);

  if (!args) return undefined;

  const selector = makeSelectNextPositionValuesForIncrease({
    ...args,
    isPnlInLeverage: false,
  });

  return q(selector);
});

export const selectOrderEditorDecreaseAmounts = createSelector((q) => {
  const order = q(selectEditingOrder);

  if (!order) return undefined;

  const market = q((s) => selectMarketsInfoData(s)?.[order.marketAddress]);
  const sizeDeltaUsd = q(selectOrderEditorSizeDeltaUsd);
  const triggerPrice = q(selectOrderEditorTriggerPrice);
  const { minCollateralUsd, minPositionSizeUsd } = q(selectPositionConstants);

  if (!market || !sizeDeltaUsd || !minCollateralUsd || !minPositionSizeUsd) {
    return undefined;
  }

  const existingPosition = q(selectOrderEditorExistingPosition);
  const keepLeverage = q(selectKeepLeverage);
  const acceptablePriceImpactBps = q(selectOrderEditorAcceptablePriceImpactBps);
  const savedAcceptablePriceImpactBuffer = q(selectSavedAcceptablePriceImpactBuffer);
  const userReferralInfo = q(selectUserReferralInfo);
  const uiFeeFactor = q(selectUiFeeFactor);

  return getDecreasePositionAmounts({
    marketInfo: market,
    collateralToken: order.targetCollateralToken,
    isLong: order.isLong,
    position: existingPosition,
    closeSizeUsd: sizeDeltaUsd,
    keepLeverage,
    triggerPrice,
    fixedAcceptablePriceImpactBps: acceptablePriceImpactBps,
    acceptablePriceImpactBuffer: savedAcceptablePriceImpactBuffer,
    userReferralInfo,
    minCollateralUsd,
    minPositionSizeUsd,
    uiFeeFactor,
    triggerOrderType: order.orderType as OrderType.LimitDecrease | OrderType.StopLossDecrease | undefined,
  });
});
