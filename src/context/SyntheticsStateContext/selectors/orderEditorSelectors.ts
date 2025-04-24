import { USD_DECIMALS } from "config/factors";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  estimateExecuteSwapOrderGasLimit,
  estimateOrderOraclePriceCount,
  getFeeItem,
} from "domain/synthetics/fees";
import { getMaxAllowedLeverageByMinCollateralFactor } from "domain/synthetics/markets";
import {
  OrderType,
  PositionOrderInfo,
  SwapOrderInfo,
  isDecreaseOrderType,
  isIncreaseOrderType,
  isLimitOrderType,
  isLimitSwapOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
  sortPositionOrders,
  sortSwapOrders,
} from "domain/synthetics/orders";
import { getPositionOrderError } from "domain/synthetics/orders/getPositionOrderError";
import { getIsPositionInfoLoaded } from "domain/synthetics/positions";
import {
  TokensRatio,
  convertToTokenAmount,
  convertToUsd,
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
  getTradeFees,
  getTradeFlagsForOrder,
} from "domain/synthetics/trade";
import { getPositionKey } from "lib/legacy";
import { BN_ZERO, parseValue } from "lib/numbers";
import { getWrappedToken } from "sdk/configs/tokens";
import { getExecutionFee } from "sdk/utils/fees/executionFee";
import { getByKey } from "sdk/utils/objects";

import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector, createSelectorFactory } from "../utils";
import { selectExternalSwapQuote } from "./tradeboxSelectors";
import {
  makeSelectIsExpressTransactionAvailable,
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
import { selectTradeboxAvailableTokensOptions } from "./tradeboxSelectors";
import { makeSelectFindSwapPath, makeSelectNextPositionValuesForIncrease } from "./tradeSelectors";

export const selectCancellingOrdersKeys = (s: SyntheticsState) => s.orderEditor.cancellingOrdersKeys;
export const selectSetCancellingOrdersKeys = (s: SyntheticsState) => s.orderEditor.setCancellingOrdersKeys;
export const selectEditingOrderState = (s: SyntheticsState) => s.orderEditor.editingOrderState;
export const selectSetEditingOrderState = (s: SyntheticsState) => s.orderEditor.setEditingOrderState;

export const selectOrderEditorIsSubmitting = (s: SyntheticsState) => s.orderEditor.isSubmitting;
export const selectOrderEditorSetIsSubmitting = (s: SyntheticsState) => s.orderEditor.setIsSubmitting;
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

export const selectOrderEditorDefaultAllowedSwapSlippageBps = (s: SyntheticsState) =>
  s.orderEditor.defaultAllowedSwapSlippageBps;
export const selectOrderEditorSetDefaultAllowedSwapSlippageBps = (s: SyntheticsState) =>
  s.orderEditor.setDefaultAllowedSwapSlippageBps;
export const selectOrderEditorSelectedAllowedSwapSlippageBps = (s: SyntheticsState) =>
  s.orderEditor.selectedAllowedSwapSlippageBps;
export const selectOrderEditorSetSelectedAllowedSwapSlippageBps = (s: SyntheticsState) =>
  s.orderEditor.setSelectedAllowedSwapSlippageBps;
export const selectOrderEditorShouldCalculateMinOutputAmount = (s: SyntheticsState) =>
  s.orderEditor.shouldCalculateMinOutputAmount;

export const selectOrderEditorSwapFees = createSelector((q) => {
  const order = q(selectOrderEditorOrder);
  const uiFeeFactor = q(selectUiFeeFactor);

  if (!order) return undefined;

  if (!isSwapOrderType(order.orderType)) {
    return undefined;
  }

  const initialCollateralUsd =
    convertToUsd(
      order.initialCollateralDeltaAmount,
      order.initialCollateralToken.decimals,
      order.initialCollateralToken.prices.minPrice
    ) ?? 0n;

  return getTradeFees({
    initialCollateralUsd,
    collateralDeltaUsd: 0n,
    sizeDeltaUsd: 0n,
    swapSteps: order.swapPathStats?.swapSteps ?? [],
    positionFeeUsd: 0n,
    swapPriceImpactDeltaUsd: order.swapPathStats?.totalSwapPriceImpactDeltaUsd ?? 0n,
    positionPriceImpactDeltaUsd: 0n,
    priceImpactDiffUsd: 0n,
    borrowingFeeUsd: 0n,
    fundingFeeUsd: 0n,
    feeDiscountUsd: 0n,
    swapProfitFeeUsd: 0n,
    uiFeeFactor,
    externalSwapQuote: undefined,
  });
});

export const selectOrderEditorTotalSwapImpactBps = createSelector((q) => {
  const fees = q(selectOrderEditorSwapFees);
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

export const selectOrderEditorSizeDeltaUsd = createSelector((q) => {
  return parseValue(q(selectOrderEditorSizeInputValue) || "0", USD_DECIMALS);
});

export const selectOrderEditorTriggerPrice = createSelector((q) => {
  const triggerPriceInputValue = q(selectOrderEditorTriggerPriceInputValue);
  const indexToken = q(selectOrderEditorIndexToken);

  if (!triggerPriceInputValue || !indexToken) return undefined;

  let triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);

  if (triggerPrice === 0n) {
    triggerPrice = undefined;
  } else if (triggerPrice !== undefined && indexToken?.visualMultiplier) {
    triggerPrice = triggerPrice / BigInt(indexToken?.visualMultiplier ?? 1);
  }

  return triggerPrice;
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

export const selectOrderEditorOrder = createSelector((q): PositionOrderInfo | SwapOrderInfo | undefined => {
  const editingOrderState = q(selectEditingOrderState);
  const order = q((state) => getByKey(selectOrdersInfoData(state), editingOrderState?.orderKey));

  return order;
});

export const selectOrderEditorPositionKey = createSelector((q) => {
  const order = q(selectOrderEditorOrder);

  if (!order) return;

  return getPositionKey(order.account, order.marketAddress, order.targetCollateralToken.address, order.isLong);
});

export const selectOrderEditorExistingPosition = createSelector((q) => {
  const positionKey = q(selectOrderEditorPositionKey);

  if (!positionKey) return undefined;

  const positionInfo = q((s) => selectPositionsInfoData(s)?.[positionKey]);

  if (!getIsPositionInfoLoaded(positionInfo)) {
    return undefined;
  }

  return positionInfo;
});

export const makeSelectOrderEditorExistingPosition = createSelectorFactory((orderKey: string) =>
  createSelector((q) => {
    const order = q((state) => getByKey(selectOrdersInfoData(state), orderKey));

    if (!order) return undefined;

    const positionKey = getPositionKey(
      order.account,
      order.marketAddress,
      order.targetCollateralToken.address,
      order.isLong
    );

    const positionInfo = q((s) => selectPositionsInfoData(s)?.[positionKey]);

    if (!getIsPositionInfoLoaded(positionInfo)) {
      return undefined;
    }

    return positionInfo;
  })
);

const selectOrderEditorNextPositionValuesForIncreaseArgs = createSelector((q) => {
  const order = q(selectOrderEditorOrder);

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

const makeSelectOrderEditorNextPositionValuesForIncreaseArgs = createSelectorFactory(
  (orderKey: string, triggerPrice: bigint) =>
    createSelector((q) => {
      const order = q((state) => getByKey(selectOrdersInfoData(state), orderKey));

      if (!order) return undefined;

      const sizeDeltaUsd = order.sizeDeltaUsd;

      const positionOrder = order as PositionOrderInfo | undefined;
      const positionIndexToken = positionOrder?.indexToken;
      const indexTokenAmount = positionIndexToken
        ? convertToTokenAmount(sizeDeltaUsd, positionIndexToken.decimals, triggerPrice)
        : undefined;
      const fromToken = q((state) => getTokenData(selectTokensData(state), order.initialCollateralTokenAddress));
      const existingPosition = q((state) => makeSelectOrderEditorExistingPosition(orderKey)(state));

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
        externalSwapQuote: undefined,
        tradeMode: isLimitOrderType(order.orderType) ? TradeMode.Limit : TradeMode.Trigger,
        tradeType: positionOrder?.isLong ? TradeType.Long : TradeType.Short,
        triggerPrice: isLimitOrderType(order.orderType) ? triggerPrice : undefined,
        tokenTypeForSwapRoute: existingPosition ? "collateralToken" : "indexToken",
        isPnlInLeverage,
      } as const;
    })
);

export const selectOrderEditorNextPositionValuesForIncrease = createSelector((q) => {
  const args = q(selectOrderEditorNextPositionValuesForIncreaseArgs);

  if (!args) return undefined;

  const selector = makeSelectNextPositionValuesForIncrease({
    ...args,
    externalSwapQuote: q(selectExternalSwapQuote),
    isExpressTxn: q(makeSelectIsExpressTransactionAvailable(false)),
  });

  return q(selector);
});

export const makeSelectOrderEditorNextPositionValuesForIncrease = createSelectorFactory(
  (orderKey: string, triggerPrice: bigint) =>
    createSelector((q) => {
      const args = q(makeSelectOrderEditorNextPositionValuesForIncreaseArgs(orderKey, triggerPrice));

      if (!args) return undefined;

      const selector = makeSelectNextPositionValuesForIncrease({
        ...args,
        isExpressTxn: q(makeSelectIsExpressTransactionAvailable(false)),
      });

      return q(selector);
    })
);

export const selectOrderEditorNextPositionValuesWithoutPnlForIncrease = createSelector((q) => {
  const args = q(selectOrderEditorNextPositionValuesForIncreaseArgs);

  if (!args) return undefined;

  const selector = makeSelectNextPositionValuesForIncrease({
    ...args,
    externalSwapQuote: q(selectExternalSwapQuote),
    isPnlInLeverage: false,
    isExpressTxn: q(makeSelectIsExpressTransactionAvailable(false)),
  });

  return q(selector);
});

export const selectOrderEditorDecreaseAmounts = createSelector((q) => {
  const order = q(selectOrderEditorOrder);

  if (!order) return undefined;

  const market = q((s) => selectMarketsInfoData(s)?.[order.marketAddress]);
  const sizeDeltaUsd = q(selectOrderEditorSizeDeltaUsd);
  const triggerPrice = q(selectOrderEditorTriggerPrice);
  const { minCollateralUsd, minPositionSizeUsd } = q(selectPositionConstants);

  if (
    !market ||
    sizeDeltaUsd === undefined ||
    minCollateralUsd === undefined ||
    minPositionSizeUsd === undefined ||
    triggerPrice === undefined ||
    triggerPrice === 0n
  ) {
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
  const order = q(selectOrderEditorOrder);
  if (!order) return undefined;

  const tokensData = q(selectTokensData);
  return getTokenData(tokensData, order.initialCollateralTokenAddress);
});

export const selectOrderEditorToToken = createSelector((q) => {
  const order = q(selectOrderEditorOrder);
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

export const selectOrderEditorIndexToken = createSelector((q) => {
  const order = q(selectOrderEditorOrder);

  if (!order) return undefined;

  const marketsData = q(selectMarketsInfoData);
  const indexTokenAddress = marketsData?.[order.marketAddress]?.indexTokenAddress;

  if (!indexTokenAddress) return undefined;

  const tokensData = q(selectTokensData);
  const token = getTokenData(tokensData, indexTokenAddress);

  return token;
});

export const selectOrderEditorMarkRatio = createSelector((q) => {
  const order = q(selectOrderEditorOrder);
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
  const order = q(selectOrderEditorOrder);
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
  const order = q(selectOrderEditorOrder);

  if (!order) return BN_ZERO;

  const fromToken = q(selectOrderEditorFromToken);
  if (!fromToken) return BN_ZERO;

  const toToken = q(selectOrderEditorToToken);
  if (!toToken) return BN_ZERO;

  let allowedSwapSlippageBps = q(selectOrderEditorSelectedAllowedSwapSlippageBps);
  const isLimitSwapOrder = isLimitSwapOrderType(order.orderType);
  const shouldCalculateMinOutputAmount = q(selectOrderEditorShouldCalculateMinOutputAmount);

  if (!isLimitSwapOrder) {
    allowedSwapSlippageBps = 0n;
  }

  const triggerRatio = q(selectOrderEditorTriggerRatio);
  const isRatioInverted = q(selectOrderEditorIsRatioInverted);

  let minOutputAmount = order.minOutputAmount;

  if (!shouldCalculateMinOutputAmount && isLimitSwapOrder) {
    return minOutputAmount;
  }

  if (triggerRatio) {
    minOutputAmount = getAmountByRatio({
      fromToken,
      toToken,
      fromTokenAmount: order.initialCollateralDeltaAmount,
      ratio: triggerRatio?.ratio,
      shouldInvertRatio: !isRatioInverted,
      allowedSwapSlippageBps,
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

    if (!isLimitSwapOrder) {
      minOutputAmount = minOutputAmount + (priceImpactAmount ?? 0n) - (swapFeeAmount ?? 0n);
    }
  }

  return minOutputAmount;
});

export const selectOrderEditorTradeFlags = createSelector((q) => {
  const order = q(selectOrderEditorOrder);
  if (!order) throw new Error("selectOrderEditorTradeFlags: Order is not defined");
  return getTradeFlagsForOrder(order);
});

export const selectOrderEditorPriceImpactFeeBps = createSelector((q) => {
  const order = q(selectOrderEditorOrder);
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
  const order = q(selectOrderEditorOrder);
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
      decreaseSwapType: order.decreasePositionSwapType,
      swapsCount: order.swapPath.length,
    });
  }

  if (estimatedGas === undefined) return undefined;

  const oraclePriceCount = estimateOrderOraclePriceCount(order.swapPath.length);

  return getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice, oraclePriceCount);
});

export const selectOrderEditorIncreaseAmounts = createSelector((q) => {
  const order = q(selectOrderEditorOrder);
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
  const externalSwapQuote = q(selectExternalSwapQuote);

  return getIncreasePositionAmounts({
    marketInfo: market,
    indexToken: positionOrder.indexToken,
    initialCollateralToken: fromToken,
    collateralToken: order.targetCollateralToken,
    isLong: order.isLong,
    initialCollateralAmount: order.initialCollateralDeltaAmount,
    externalSwapQuote,
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
  const order = q(selectOrderEditorOrder);
  if (!order) throw new Error("selectOrderEditorSwapRoutes: Order is not defined");

  const toToken = q(selectOrderEditorToToken);
  const selectFindSwapPath = makeSelectFindSwapPath(order.initialCollateralTokenAddress, toToken?.address);

  return q(selectFindSwapPath);
});

export const selectOrderEditorMaxAllowedLeverage = createSelector((q) => {
  const order = q(selectOrderEditorOrder);
  if (!order) return getMaxAllowedLeverageByMinCollateralFactor(undefined);

  const minCollateralFactor = q((s) => selectMarketsInfoData(s)?.[order.marketAddress]?.minCollateralFactor);
  return getMaxAllowedLeverageByMinCollateralFactor(minCollateralFactor);
});

export const makeSelectOrderEditorMaxAllowedLeverage = createSelectorFactory((orderKey: string) =>
  createSelector((q) => {
    const order = q((state) => getByKey(selectOrdersInfoData(state), orderKey));
    if (!order) return getMaxAllowedLeverageByMinCollateralFactor(undefined);

    const minCollateralFactor = q((s) => selectMarketsInfoData(s)?.[order.marketAddress]?.minCollateralFactor);
    return getMaxAllowedLeverageByMinCollateralFactor(minCollateralFactor);
  })
);

export const selectOrderEditorPositionOrderError = createSelector((q) => {
  const order = q(selectOrderEditorOrder);

  if (!order || isSwapOrderType(order.orderType)) {
    return;
  }

  const positionOrder = order as PositionOrderInfo;

  const indexToken = q(selectOrderEditorIndexToken);
  const markPrice = positionOrder.isLong ? indexToken?.prices?.minPrice : indexToken?.prices?.maxPrice;

  const sizeDeltaUsd = q(selectOrderEditorSizeDeltaUsd);
  const triggerPrice = q(selectOrderEditorTriggerPrice);
  const acceptablePrice = q(selectOrderEditorAcceptablePrice);
  const existingPosition = q(selectOrderEditorExistingPosition);
  const nextPositionValuesForIncrease = q(selectOrderEditorNextPositionValuesForIncrease);
  const maxAllowedLeverage = q(selectOrderEditorMaxAllowedLeverage);

  return getPositionOrderError({
    positionOrder,
    markPrice,
    sizeDeltaUsd,
    triggerPrice,
    acceptablePrice,
    existingPosition,
    nextPositionValuesForIncrease,
    maxAllowedLeverage,
  });
});

export const makeSelectOrderEditorPositionOrderError = createSelectorFactory(
  (orderKey: string, triggerPrice: bigint) => {
    const selectExistingPosition = makeSelectOrderEditorExistingPosition(orderKey);
    const selectNextPositionValuesForIncrease = makeSelectOrderEditorNextPositionValuesForIncrease(
      orderKey,
      triggerPrice
    );
    const selectMaxAllowedLeverage = makeSelectOrderEditorMaxAllowedLeverage(orderKey);

    return createSelector((q) => {
      const order = q((state) => getByKey(selectOrdersInfoData(state), orderKey));

      if (!order || isSwapOrderType(order.orderType)) {
        return;
      }

      const positionOrder = order as PositionOrderInfo;

      const indexToken = q((state) => getByKey(selectMarketsInfoData(state), order.marketAddress)?.indexToken);
      const markPrice = positionOrder.isLong ? indexToken?.prices?.minPrice : indexToken?.prices?.maxPrice;

      const sizeDeltaUsd = order.sizeDeltaUsd;

      const acceptablePrice = undefined;

      const existingPosition = q(selectExistingPosition);
      const nextPositionValuesForIncrease = q(selectNextPositionValuesForIncrease);
      const maxAllowedLeverage = q(selectMaxAllowedLeverage);

      return getPositionOrderError({
        positionOrder,
        markPrice,
        sizeDeltaUsd,
        triggerPrice,
        acceptablePrice,
        existingPosition,
        nextPositionValuesForIncrease,
        maxAllowedLeverage,
      });
    });
  }
);
