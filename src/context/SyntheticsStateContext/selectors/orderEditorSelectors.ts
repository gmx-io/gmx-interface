import {
  OrderType,
  PositionOrderInfo,
  SwapOrderInfo,
  isDecreaseOrderType,
  isIncreaseOrderType,
  isLimitOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
  sortPositionOrders,
  sortSwapOrders,
} from "domain/synthetics/orders";
import {
  TokensRatio,
  convertToTokenAmount,
  getAmountByRatio,
  getTokenData,
  getTokensRatioByPrice,
} from "domain/synthetics/tokens";
import {
  TradeMode,
  TradeType,
  getAcceptablePriceInfo,
  getDecreasePositionAmounts,
  getIncreasePositionAmounts,
  getSwapPathOutputAddresses,
  getTradeFlagsForOrder,
} from "domain/synthetics/trade";
import { USD_DECIMALS, getPositionKey } from "lib/legacy";
import { BN_ZERO, parseValue } from "lib/numbers";
import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector } from "../utils";
import {
  selectChainId,
  selectGasLimits,
  selectGasPrice,
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
import { makeSelectFindSwapPath, makeSelectNextPositionValuesForIncrease } from "./tradeSelectors";
import { selectTradeboxAvailableTokensOptions } from "./tradeboxSelectors";
import { getWrappedToken } from "config/tokens";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  estimateExecuteSwapOrderGasLimit,
  getExecutionFee,
  getFeeItem,
} from "domain/synthetics/fees";
import { getMaxAllowedLeverageByMinCollateralFactor } from "domain/synthetics/markets";

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
    initialCollateralAmount: positionOrder?.initialCollateralDeltaAmount ?? 0n,
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

  if (!market || sizeDeltaUsd === undefined || minCollateralUsd === undefined || minPositionSizeUsd === undefined) {
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

export const selectOrderEditorFromToken = createSelector((q) => {
  const order = q(selectEditingOrder);
  if (!order) return undefined;

  const tokensData = q(selectTokensData);
  return getTokenData(tokensData, order.initialCollateralTokenAddress);
});

export const selectOrderEditorToToken = createSelector((q) => {
  const order = q(selectEditingOrder);
  if (!order) return undefined;

  const marketsInfoData = q(selectMarketsInfoData);
  const chainId = q(selectChainId);

  const swapPathInfo = marketsInfoData
    ? getSwapPathOutputAddresses({
        marketsInfoData: marketsInfoData,
        initialCollateralAddress: order.initialCollateralTokenAddress,
        swapPath: order.swapPath,
        wrappedNativeTokenAddress: getWrappedToken(chainId).address,
        shouldUnwrapNativeToken: order.shouldUnwrapNativeToken,
        isIncrease: isIncreaseOrderType(order.orderType),
      })
    : undefined;

  if (!swapPathInfo) return undefined;
  if (!swapPathInfo.outTokenAddress) return undefined;

  return q((s) => selectTokensData(s)?.[swapPathInfo.outTokenAddress]);
});

export const selectOrderEditorMarkRatio = createSelector((q) => {
  const order = q(selectEditingOrder);
  if (!order) return undefined;
  const fromToken = q(selectOrderEditorFromToken);
  if (!fromToken) return undefined;
  const toToken = q(selectOrderEditorToToken);
  if (!toToken) return undefined;

  return getTokensRatioByPrice({
    fromToken,
    toToken,
    fromPrice: fromToken.prices.minPrice,
    toPrice: toToken.prices.minPrice,
  });
});

export const selectOrderEditorTriggerRatio = createSelector((q) => {
  const order = q(selectEditingOrder);
  if (!order) return undefined;

  const markRatio = q(selectOrderEditorMarkRatio);
  if (!markRatio || !isSwapOrderType(order.orderType)) return undefined;

  const ratio = parseValue(q(selectOrderEditorTriggerRatioInputValue), USD_DECIMALS);
  const tokensRatio: TokensRatio = {
    ratio: ratio != undefined && ratio > 0 ? ratio : markRatio.ratio,
    largestToken: markRatio.largestToken,
    smallestToken: markRatio.smallestToken,
  };

  return tokensRatio;
});

export const selectOrderEditorIsRatioInverted = createSelector((q) => {
  const markRatio = q(selectOrderEditorMarkRatio);
  const fromToken = q(selectOrderEditorFromToken);
  return markRatio?.largestToken.address === fromToken?.address;
});

export const selectOrderEditorMinOutputAmount = createSelector((q) => {
  const order = q(selectEditingOrder);
  if (!order) return BN_ZERO;

  const fromToken = q(selectOrderEditorFromToken);
  if (!fromToken) return BN_ZERO;

  const toToken = q(selectOrderEditorToToken);
  if (!toToken) return BN_ZERO;

  const triggerRatio = q(selectOrderEditorTriggerRatio);
  const isRatioInverted = q(selectOrderEditorIsRatioInverted);

  let minOutputAmount = order.minOutputAmount;

  if (triggerRatio) {
    minOutputAmount = getAmountByRatio({
      fromToken,
      toToken,
      fromTokenAmount: order.initialCollateralDeltaAmount,
      ratio: triggerRatio?.ratio,
      shouldInvertRatio: !isRatioInverted,
    });

    const priceImpactAmount = convertToTokenAmount(
      order.swapPathStats?.totalSwapPriceImpactDeltaUsd,
      order.targetCollateralToken.decimals,
      order.targetCollateralToken.prices.minPrice
    );

    const swapFeeAmount = convertToTokenAmount(
      order.swapPathStats?.totalSwapFeeUsd,
      order.targetCollateralToken.decimals,
      order.targetCollateralToken.prices.minPrice
    );

    minOutputAmount = minOutputAmount + (priceImpactAmount ?? 0n) - (swapFeeAmount ?? 0n);
  }

  return minOutputAmount;
});

export const selectOrderEditorTradeFlags = createSelector((q) => {
  const order = q(selectEditingOrder);
  if (!order) throw new Error("selectOrderEditorTradeFlags: Order is not defined");
  return getTradeFlagsForOrder(order);
});

export const selectOrderEditorPriceImpactFeeBps = createSelector((q) => {
  const order = q(selectEditingOrder);
  if (!order) return undefined;

  const sizeDeltaUsd = q(selectOrderEditorSizeDeltaUsd);
  const market = q((s) => selectMarketsInfoData(s)?.[order.marketAddress]);
  const tokensData = q(selectTokensData);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);
  const markPrice = order.isLong ? indexToken?.prices?.minPrice : indexToken?.prices?.maxPrice;

  const priceImpactFeeBps =
    market &&
    getFeeItem(
      getAcceptablePriceInfo({
        indexPrice: markPrice!,
        isIncrease: isIncreaseOrderType(order.orderType),
        isLong: order.isLong,
        marketInfo: market,
        sizeDeltaUsd: sizeDeltaUsd!,
      }).priceImpactDeltaUsd,
      sizeDeltaUsd
    )?.bps;

  return priceImpactFeeBps;
});

export const selectOrderEditorExecutionFee = createSelector((q) => {
  const order = q(selectEditingOrder);
  if (!order) return undefined;

  const gasLimits = q(selectGasLimits);
  if (!gasLimits) return undefined;

  const tokensData = q(selectTokensData);
  if (!tokensData) return undefined;

  const gasPrice = q(selectGasPrice);
  if (gasPrice === undefined) return undefined;

  const chainId = q(selectChainId);

  let estimatedGas: bigint | undefined;

  if (isSwapOrderType(order.orderType)) {
    estimatedGas = estimateExecuteSwapOrderGasLimit(gasLimits, {
      swapsCount: order.swapPath.length,
    });
  }

  if (isIncreaseOrderType(order.orderType)) {
    estimatedGas = estimateExecuteIncreaseOrderGasLimit(gasLimits, {
      swapsCount: order.swapPath.length,
    });
  }

  if (isDecreaseOrderType(order.orderType)) {
    estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
      swapsCount: order.swapPath.length,
    });
  }

  if (estimatedGas === undefined) return undefined;

  return getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);
});

export const selectOrderEditorIncreaseAmounts = createSelector((q) => {
  const order = q(selectEditingOrder);
  if (!order) return undefined;

  const isLimitIncreaseOrder = order.orderType === OrderType.LimitIncrease;

  if (!isLimitIncreaseOrder) return undefined;

  const toToken = q(selectOrderEditorToToken);
  if (!toToken) return undefined;

  const fromToken = q(selectOrderEditorFromToken);
  if (!fromToken) return undefined;

  const market = q((s) => selectMarketsInfoData(s)?.[order.marketAddress]);
  if (!market) return undefined;

  const selectFindSwapPath = makeSelectFindSwapPath(order.initialCollateralTokenAddress, toToken?.address);
  const findSwapPath = q(selectFindSwapPath);
  const triggerPrice = q(selectOrderEditorTriggerPrice);
  const existingPosition = q(selectOrderEditorExistingPosition);
  const sizeDeltaUsd = q(selectOrderEditorSizeDeltaUsd);
  const userReferralInfo = q(selectUserReferralInfo);
  const uiFeeFactor = q(selectUiFeeFactor);

  const positionOrder = order as PositionOrderInfo;
  const indexTokenAmount = convertToTokenAmount(sizeDeltaUsd, positionOrder.indexToken.decimals, triggerPrice);

  return getIncreasePositionAmounts({
    marketInfo: market,
    indexToken: positionOrder.indexToken,
    initialCollateralToken: fromToken,
    collateralToken: order.targetCollateralToken,
    isLong: order.isLong,
    initialCollateralAmount: order.initialCollateralDeltaAmount,
    indexTokenAmount,
    leverage: existingPosition?.leverage,
    triggerPrice: isLimitOrderType(order.orderType) ? triggerPrice : undefined,
    position: existingPosition,
    findSwapPath,
    userReferralInfo,
    uiFeeFactor,
    strategy: "independent",
  });
});

export const selectOrderEditorFindSwapPath = createSelector((q) => {
  const order = q(selectEditingOrder);
  if (!order) throw new Error("selectOrderEditorSwapRoutes: Order is not defined");

  const toToken = q(selectOrderEditorToToken);
  const selectFindSwapPath = makeSelectFindSwapPath(order.initialCollateralTokenAddress, toToken?.address);

  return q(selectFindSwapPath);
});

export const selectOrderEditorMaxAllowedLeverage = createSelector((q) => {
  const order = q(selectEditingOrder);
  if (!order) return getMaxAllowedLeverageByMinCollateralFactor(undefined);

  const minCollateralFactor = q((s) => selectMarketsInfoData(s)?.[order.marketAddress]?.minCollateralFactor);
  return getMaxAllowedLeverageByMinCollateralFactor(minCollateralFactor);
});
