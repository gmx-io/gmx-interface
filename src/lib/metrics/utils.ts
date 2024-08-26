import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { EventLogData } from "context/SyntheticsEvents";
import { ExecutionFee } from "domain/synthetics/fees";
import { MarketInfo } from "domain/synthetics/markets";
import { OrderType } from "domain/synthetics/orders";
import { TokenData } from "domain/synthetics/tokens";
import { DecreasePositionAmounts, IncreasePositionAmounts, SwapAmounts } from "domain/synthetics/trade";
import { TxError } from "lib/contracts/transactionErrors";
import { formatTokenAmount, roundToOrder } from "lib/numbers";
import { metrics, SubmittedOrderEvent } from ".";
import { prepareErrorMetricData } from "./errorReporting";
import {
  DecreaseOrderMetricData,
  EditCollateralMetricData,
  IncreaseOrderMetricData,
  OrderCancelledEvent,
  OrderCreatedEvent,
  OrderExecutedEvent,
  OrderMetricData,
  OrderMetricId,
  OrderMetricType,
  OrderSentEvent,
  OrderStage,
  OrderTxnFailedEvent,
  PendingTxnErrorEvent,
  ShiftGmMetricData,
  SwapGmMetricData,
  SwapMetricData,
} from "./types";
import { USD_DECIMALS } from "config/factors";

export function getMetricTypeByOrderType(p: {
  orderType: OrderType;
  sizeDeltaUsd: bigint | undefined;
}): OrderMetricType {
  const { orderType, sizeDeltaUsd } = p;

  if (orderType === OrderType.MarketSwap) {
    return "swap";
  }

  if (orderType === OrderType.LimitSwap) {
    return "limitSwap";
  }

  if (orderType === OrderType.MarketIncrease) {
    if (sizeDeltaUsd === 0n) {
      return "depositCollateral";
    }

    return "increasePosition";
  }

  if (orderType === OrderType.MarketDecrease) {
    if (sizeDeltaUsd === 0n) {
      return "withdrawCollateral";
    }

    return "decreasePosition";
  }

  if (orderType === OrderType.LimitIncrease) {
    return "limitOrder";
  }

  if (orderType === OrderType.LimitDecrease) {
    return "takeProfitOrder";
  }

  return "stopLossOrder";
}

export function initSwapMetricData({
  fromToken,
  toToken,
  swapAmounts,
  executionFee,
  orderType,
  hasReferralCode,
  subaccount,
  allowedSlippage,
}: {
  fromToken: TokenData | undefined;
  toToken: TokenData | undefined;
  swapAmounts: SwapAmounts | undefined;
  executionFee: ExecutionFee | undefined;
  orderType: OrderType | undefined;
  allowedSlippage: number | undefined;
  hasReferralCode: boolean | undefined;
  subaccount: Subaccount | undefined;
}) {
  return metrics.setCachedMetricData<SwapMetricData>({
    metricId: getSwapOrderMetricId({
      initialCollateralTokenAddress: fromToken?.wrappedAddress || fromToken?.address,
      swapPath: swapAmounts?.swapPathStats?.swapPath,
      orderType,
      initialCollateralDeltaAmount: swapAmounts?.amountIn,
      executionFee: executionFee?.feeTokenAmount,
    }),
    metricType: orderType === OrderType.LimitSwap ? "limitSwap" : "swap",
    initialCollateralTokenAddress: fromToken?.address,
    hasReferralCode,
    initialCollateralSymbol: fromToken?.symbol,
    toTokenAddress: toToken?.address,
    toTokenSymbol: toToken?.symbol,
    initialCollateralDeltaAmount: formatAmountForMetrics(swapAmounts?.amountIn, fromToken?.decimals),
    minOutputAmount: formatAmountForMetrics(swapAmounts?.minOutputAmount, toToken?.decimals),
    swapPath: swapAmounts?.swapPathStats?.swapPath,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    allowedSlippage,
    orderType,
    is1ct: Boolean(subaccount && fromToken?.address !== NATIVE_TOKEN_ADDRESS),
    requestId: getRequestId(),
  });
}

export function initIncreaseOrderMetricData({
  fromToken,
  increaseAmounts,
  hasExistingPosition,
  executionFee,
  orderType,
  hasReferralCode,
  subaccount,
  triggerPrice,
  marketInfo,
  isLong,
}: {
  fromToken: TokenData | undefined;
  increaseAmounts: IncreasePositionAmounts | undefined;
  executionFee: ExecutionFee | undefined;
  orderType: OrderType;
  allowedSlippage: number | undefined;
  hasReferralCode: boolean;
  hasExistingPosition: boolean | undefined;
  triggerPrice: bigint | undefined;
  marketInfo: MarketInfo | undefined;
  subaccount: Subaccount | undefined;
  isLong: boolean | undefined;
}) {
  return metrics.setCachedMetricData<IncreaseOrderMetricData>({
    metricId: getPositionOrderMetricId({
      marketAddress: marketInfo?.marketTokenAddress,
      initialCollateralTokenAddress: fromToken?.wrappedAddress || fromToken?.address,
      swapPath: increaseAmounts?.swapPathStats?.swapPath,
      isLong,
      orderType,
      sizeDeltaUsd: increaseAmounts?.sizeDeltaUsd,
      initialCollateralDeltaAmount: increaseAmounts?.initialCollateralAmount,
    }),
    requestId: getRequestId(),
    is1ct: Boolean(subaccount && fromToken?.address !== NATIVE_TOKEN_ADDRESS),
    metricType: orderType === OrderType.LimitIncrease ? "limitOrder" : "increasePosition",
    hasReferralCode,
    hasExistingPosition,
    marketAddress: marketInfo?.marketTokenAddress,
    marketName: marketInfo?.name,
    initialCollateralTokenAddress: fromToken?.address,
    initialCollateralSymbol: fromToken?.symbol,
    initialCollateralDeltaAmount: formatAmountForMetrics(increaseAmounts?.initialCollateralAmount, fromToken?.decimals),
    swapPath: increaseAmounts?.swapPathStats?.swapPath || [],
    sizeDeltaUsd: formatAmountForMetrics(increaseAmounts?.sizeDeltaUsd),
    sizeDeltaInTokens: formatAmountForMetrics(increaseAmounts?.sizeDeltaInTokens, marketInfo?.indexToken.decimals),
    triggerPrice: formatAmountForMetrics(triggerPrice, USD_DECIMALS, false),
    acceptablePrice: formatAmountForMetrics(increaseAmounts?.acceptablePrice, USD_DECIMALS, false),
    isLong,
    orderType,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
  });
}

export function initDecreaseOrderMetricData({
  collateralToken,
  decreaseAmounts,
  hasExistingPosition,
  executionFee,
  orderType,
  hasReferralCode,
  subaccount,
  triggerPrice,
  marketInfo,
  isLong,
  place,
}: {
  collateralToken: TokenData | undefined;
  decreaseAmounts: DecreasePositionAmounts | undefined;
  executionFee: ExecutionFee | undefined;
  orderType: OrderType | undefined;
  allowedSlippage: number | undefined;
  hasReferralCode: boolean | undefined;
  hasExistingPosition: boolean | undefined;
  triggerPrice: bigint | undefined;
  marketInfo: MarketInfo | undefined;
  subaccount: Subaccount | undefined;
  isLong: boolean | undefined;
  place: "tradeBox" | "positionSeller";
}) {
  let metricType;
  if (orderType === OrderType.LimitDecrease) {
    metricType = "takeProfitOrder";
  } else if (orderType === OrderType.StopLossDecrease) {
    metricType = "stopLossOrder";
  } else {
    metricType = "decreasePosition";
  }

  return metrics.setCachedMetricData<DecreaseOrderMetricData>({
    metricId: getPositionOrderMetricId({
      marketAddress: marketInfo?.marketTokenAddress,
      initialCollateralTokenAddress: collateralToken?.wrappedAddress || collateralToken?.address,
      swapPath: [],
      isLong,
      orderType,
      sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
      initialCollateralDeltaAmount: decreaseAmounts?.collateralDeltaAmount,
    }),
    metricType,
    place,
    isStandalone: true,
    isFullClose: decreaseAmounts?.isFullClose,
    hasReferralCode,
    hasExistingPosition,
    marketAddress: marketInfo?.marketTokenAddress,
    marketName: marketInfo?.name,
    initialCollateralTokenAddress: collateralToken?.address,
    initialCollateralSymbol: collateralToken?.symbol,
    initialCollateralDeltaAmount: formatAmountForMetrics(
      decreaseAmounts?.collateralDeltaAmount,
      collateralToken?.decimals
    ),
    swapPath: [],
    sizeDeltaUsd: formatAmountForMetrics(decreaseAmounts?.sizeDeltaUsd),
    sizeDeltaInTokens: formatAmountForMetrics(decreaseAmounts?.sizeDeltaInTokens, marketInfo?.indexToken.decimals),
    triggerPrice: formatAmountForMetrics(triggerPrice, USD_DECIMALS, false),
    acceptablePrice: formatAmountForMetrics(decreaseAmounts?.acceptablePrice, USD_DECIMALS, false),
    isLong,
    orderType,
    decreaseSwapType: decreaseAmounts?.decreaseSwapType,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    is1ct: Boolean(subaccount),
    requestId: getRequestId(),
  });
}

export function initEditCollateralMetricData({
  orderType,
  marketInfo,
  collateralToken,
  collateralDeltaAmount,
  selectedCollateralAddress,
  isLong,
  executionFee,
  subaccount,
}: {
  collateralToken: TokenData | undefined;
  executionFee: ExecutionFee | undefined;
  selectedCollateralAddress: string | undefined;
  collateralDeltaAmount: bigint | undefined;
  orderType: OrderType | undefined;
  marketInfo: MarketInfo | undefined;
  subaccount: Subaccount | undefined;
  isLong: boolean | undefined;
}) {
  return metrics.setCachedMetricData<EditCollateralMetricData>({
    metricId: getPositionOrderMetricId({
      marketAddress: marketInfo?.marketTokenAddress,
      initialCollateralTokenAddress: collateralToken?.wrappedAddress || collateralToken?.address,
      swapPath: [],
      isLong,
      orderType,
      sizeDeltaUsd: 0n,
      initialCollateralDeltaAmount: collateralDeltaAmount,
    }),
    metricType: orderType === OrderType.MarketIncrease ? "depositCollateral" : "withdrawCollateral",
    marketAddress: marketInfo?.marketTokenAddress,
    isStandalone: true,
    marketName: marketInfo?.name,
    initialCollateralTokenAddress: selectedCollateralAddress,
    initialCollateralSymbol: collateralToken?.symbol,
    initialCollateralDeltaAmount: formatAmountForMetrics(collateralDeltaAmount, collateralToken?.decimals),
    swapPath: [],
    isLong,
    orderType,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    is1ct: Boolean(subaccount && selectedCollateralAddress !== NATIVE_TOKEN_ADDRESS),
    requestId: getRequestId(),
  });
}

export function initGMSwapMetricData({
  longToken,
  shortToken,
  isDeposit,
  executionFee,
  marketInfo,
  marketToken,
  longTokenAmount,
  shortTokenAmount,
  marketTokenAmount,
}: {
  longToken: TokenData | undefined;
  shortToken: TokenData | undefined;
  marketToken: TokenData | undefined;
  isDeposit: boolean;
  executionFee: ExecutionFee | undefined;
  marketInfo: MarketInfo | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  marketTokenAmount: bigint | undefined;
}) {
  return metrics.setCachedMetricData<SwapGmMetricData>({
    metricId: getGMSwapMetricId({
      marketAddress: marketInfo?.marketTokenAddress,
      executionFee: executionFee?.feeTokenAmount,
    }),
    metricType: isDeposit ? "buyGM" : "sellGM",
    requestId: getRequestId(),
    initialLongTokenAddress: longToken?.address,
    initialShortTokenAddress: shortToken?.address,
    marketAddress: marketInfo?.marketTokenAddress,
    marketName: marketInfo?.name,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    longTokenAmount: formatAmountForMetrics(longTokenAmount, longToken?.decimals),
    shortTokenAmount: formatAmountForMetrics(shortTokenAmount, shortToken?.decimals),
    marketTokenAmount: formatAmountForMetrics(marketTokenAmount, marketToken?.decimals),
  });
}

export function initShiftGmMetricData({
  executionFee,
  fromMarketInfo,
  toMarketInfo,
  marketToken,
  minMarketTokenAmount,
}: {
  executionFee: ExecutionFee | undefined;
  fromMarketInfo: MarketInfo | undefined;
  toMarketInfo: MarketInfo | undefined;
  minMarketTokenAmount: bigint | undefined;
  marketToken: TokenData | undefined;
}) {
  return metrics.setCachedMetricData<ShiftGmMetricData>({
    metricId: getShiftGMMetricId({
      fromMarketAddress: fromMarketInfo?.marketTokenAddress,
      toMarketAddress: toMarketInfo?.marketTokenAddress,
      executionFee: executionFee?.feeTokenAmount,
    }),
    metricType: "shiftGM",
    requestId: getRequestId(),
    fromMarketAddress: fromMarketInfo?.marketTokenAddress,
    fromMarketName: fromMarketInfo?.name,
    toMarketName: toMarketInfo?.name,
    toMarketAddress: toMarketInfo?.marketTokenAddress,
    minToMarketTokenAmount: formatAmountForMetrics(minMarketTokenAmount, marketToken?.decimals),
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
  });
}

export function getGMSwapMetricId(p: {
  marketAddress: string | undefined;
  executionFee: bigint | undefined;
}): SwapGmMetricData["metricId"] {
  return `gm:${[p.marketAddress || "marketTokenAddress", p.executionFee?.toString || "marketTokenAmount"].join(":")}`;
}

export function getShiftGMMetricId(p: {
  fromMarketAddress: string | undefined;
  toMarketAddress: string | undefined;
  executionFee: bigint | undefined;
}): ShiftGmMetricData["metricId"] {
  return `shift:${[p.fromMarketAddress || "fromMarketAddress", p.toMarketAddress || "toMarketAddress", p.executionFee?.toString() || "marketTokenAmount"].join(":")}`;
}

export function getSwapOrderMetricId(p: {
  initialCollateralTokenAddress: string | undefined;
  swapPath: string[] | undefined;
  orderType: OrderType | undefined;
  initialCollateralDeltaAmount: bigint | undefined;
  executionFee: bigint | undefined;
}): SwapMetricData["metricId"] {
  return `swap:${[
    p.initialCollateralTokenAddress || "initialColltateralTokenAddress",
    p.swapPath?.join("-") || "swapPath",
    p.orderType || "orderType",
    p.initialCollateralDeltaAmount?.toString() || "initialCollateralDeltaAmount",
    p.executionFee?.toString() || "executionFee",
  ].join(":")}`;
}

export function getPositionOrderMetricId(p: {
  marketAddress: string | undefined;
  initialCollateralTokenAddress: string | undefined;
  swapPath: string[] | undefined;
  isLong: boolean | undefined;
  orderType: OrderType | undefined;
  sizeDeltaUsd: bigint | undefined;
  initialCollateralDeltaAmount: bigint | undefined;
}): IncreaseOrderMetricData["metricId"] {
  return `position:${[
    p.marketAddress || "marketAddress",
    p.initialCollateralTokenAddress || "initialCollateralTokenAddress",
    p.swapPath?.join("-") || "swapPath",
    p.isLong || "isLong",
    p.orderType || "orderType",
    p.sizeDeltaUsd?.toString() || "sizeDeltaUsd",
    p.initialCollateralDeltaAmount?.toString() || "initialCollateralDeltaAmount",
  ].join(":")}`;
}

export function sendOrderSubmittedMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics._sendError("Order metric data not found", "sendOrderSubmittedMetric");
    return;
  }

  metrics.pushEvent<SubmittedOrderEvent>({
    event: `${metricData?.metricType}.submitted`,
    isError: false,
    data: metricData,
  });
}

export function sendTxnValidationErrorMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics._sendError("Order metric data not found", "sendTxnValidationErrorMetric");
    return;
  }

  metrics.pushEvent({
    event: `${metricData.metricType}.failed`,
    isError: true,
    data: {
      errorContext: "submit",
      errorMessage: "Error submitting order, missed data",
      ...metricData,
    },
  });
}

export function makeTxnSentMetricsHandler(metricId: OrderMetricId) {
  return () => {
    const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

    if (!metricData) {
      metrics._sendError("Order metric data not found", "makeTxnSentMetricsHandler");
      return;
    }

    metrics.startTimer(metricId);

    metrics.pushEvent<OrderSentEvent>({
      event: `${metricData.metricType}.sent`,
      isError: false,
      time: metrics.getTime(metricId)!,
      data: metricData,
    });

    return Promise.resolve();
  };
}

export function makeTxnErrorMetricsHandler(metricId: OrderMetricId) {
  return (error: Error | TxError) => {
    const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

    if (!metricData) {
      metrics._sendError("Order metric data not found", "makeTxnErrorMetricsHandler");
      return;
    }

    const errorData = prepareErrorMetricData(error);

    metrics.pushEvent<OrderTxnFailedEvent>({
      event: `${metricData.metricType}.${errorData?.isUserRejectedError ? OrderStage.Rejected : OrderStage.Failed}`,
      isError: true,
      data: {
        errorContext: "sending",
        ...(errorData || {}),
        ...metricData,
      },
    });

    throw error;
  };
}

export function sendPendingOrderTxnErrorMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId, true);
  const metricType = (metricData as OrderMetricData)?.metricType || "unknownOrder";

  if (!metricData) {
    metrics._sendError("Order metric data not found", "sendPendingOrderTxnErrorMetric");
    return;
  }

  metrics.pushEvent<PendingTxnErrorEvent>({
    event: `${metricType}.failed`,
    isError: true,
    time: metrics.getTime(metricId, true),
    data: {
      ...(metricData || {}),
      errorContext: "minting",
      errorMessage: "Pending txn error",
    },
  });
}

export function sendOrderCreatedMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics._sendError("Order metric data not found", "sendOrderCreatedMetric");
    return;
  }

  metrics.pushEvent<OrderCreatedEvent>({
    event: `${metricData.metricType}.created`,
    isError: false,
    time: metrics.getTime(metricId),
    data: metricData,
  });
}

export function sendOrderExecutedMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics._sendError("Order metric data not found", "sendOrderExecutedMetric");
    return;
  }

  metrics.pushEvent<OrderExecutedEvent>({
    event: `${metricData.metricType}.executed`,
    isError: false,
    time: metrics.getTime(metricId, true),
    data: metricData,
  });
}

export function sendOrderCancelledMetric(metricId: OrderMetricId, eventData: EventLogData) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics._sendError("Order metric data not found", "sendOrderCancelledMetric");
    return;
  }

  metrics.pushEvent<OrderCancelledEvent>({
    event: `${metricData.metricType}.failed`,
    isError: true,
    time: metrics.getTime(metricId, true),
    data: {
      ...(metricData || {}),
      errorMessage: `${metricData.metricType} cancelled`,
      reason: eventData.stringItems.items.reason,
      errorContext: "execution",
    },
  });
}

export function formatAmountForMetrics(amount?: bigint, decimals = USD_DECIMALS, round = true) {
  if (amount === undefined) {
    return undefined;
  }

  const value = round ? roundToOrder(amount) : amount;
  const str = formatTokenAmount(value, decimals);

  if (!str) {
    return undefined;
  }

  return parseFloat(str);
}

export function getRequestId() {
  return `${Date.now()}_${Math.round(Math.random() * 10000000)}`;
}
