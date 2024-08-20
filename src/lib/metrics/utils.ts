import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { EventLogData } from "context/SyntheticsEvents";
import { ExecutionFee } from "domain/synthetics/fees";
import { MarketInfo } from "domain/synthetics/markets";
import { OrderType } from "domain/synthetics/orders";
import { TokenData } from "domain/synthetics/tokens";
import { DecreasePositionAmounts, IncreasePositionAmounts, SwapAmounts } from "domain/synthetics/trade";
import { TxError } from "lib/contracts/transactionErrors";
import { USD_DECIMALS } from "lib/legacy";
import { formatTokenAmount, formatUsd, roundToOrder } from "lib/numbers";
import { metrics } from ".";
import { prepareErrorMetricData } from "./errorReporting";
import {
  DecreaseOrderMetricData,
  EditCollateralMetricData,
  ErrorMetricData,
  IncreaseOrderMetricData,
  MetricData,
  OrderMetricType,
  ShiftGmMetricData,
  SwapGmMetricData,
  SwapMetricData,
} from "./types";

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
  const metricData: SwapMetricData = {
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
  };

  const metricId = getSwapOrderMetricId({
    ...metricData,
    minOutputAmount: swapAmounts?.minOutputAmount,
    initialCollateralDeltaAmount: swapAmounts?.amountIn,
  });

  metrics.setCachedMetricData(metricId, metricData);

  return {
    metricData,
    metricId,
  };
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
  const metricData: IncreaseOrderMetricData = {
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
    triggerPrice: formatUsd(triggerPrice),
    acceptablePrice: formatUsd(increaseAmounts?.acceptablePrice),
    isLong,
    orderType,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    is1ct: Boolean(subaccount && fromToken?.address !== NATIVE_TOKEN_ADDRESS),
    requestId: getRequestId(),
  };
  const metricId = getPositionOrderMetricId({
    ...metricData,
    sizeDeltaUsd: increaseAmounts?.sizeDeltaUsd,
    initialCollateralDeltaAmount: increaseAmounts?.initialCollateralAmount,
  });

  metrics.setCachedMetricData(metricId, metricData);

  return {
    metricData,
    metricId,
  };
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

  const metricData: DecreaseOrderMetricData = {
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
    triggerPrice: formatUsd(triggerPrice),
    acceptablePrice: formatUsd(decreaseAmounts?.acceptablePrice),
    isLong,
    orderType,
    decreaseSwapType: decreaseAmounts?.decreaseSwapType,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    is1ct: Boolean(subaccount),
    requestId: getRequestId(),
  };

  const metricId = getPositionOrderMetricId({
    ...metricData,
    sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
    initialCollateralDeltaAmount: decreaseAmounts?.collateralDeltaAmount,
  });
  metrics.setCachedMetricData(metricId, metricData);

  return {
    metricData,
    metricId,
  };
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
  const metricData: EditCollateralMetricData = {
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
  };

  const metricId = getPositionOrderMetricId({
    ...metricData,
    sizeDeltaUsd: 0n,
    initialCollateralDeltaAmount: collateralDeltaAmount,
  });

  metrics.setCachedMetricData(metricId, metricData);

  return {
    metricData,
    metricId,
  };
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
  const metricData: SwapGmMetricData = {
    metricType: isDeposit ? "buyGM" : "sellGM",
    requestId: getRequestId(),
    initialLongTokenAddress: undefined,
    initialShortTokenAddress: undefined,
    marketAddress: marketInfo?.marketTokenAddress,
    marketName: marketInfo?.name,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    longTokenAmount: formatAmountForMetrics(longTokenAmount, longToken?.decimals),
    shortTokenAmount: formatAmountForMetrics(shortTokenAmount, shortToken?.decimals),
    marketTokenAmount: formatAmountForMetrics(marketTokenAmount, marketToken?.decimals),
  };
  const metricId = getGMSwapMetricId({ ...metricData, marketTokenAmount });
  metrics.setCachedMetricData(metricId, metricData);

  return {
    metricData,
    metricId,
  };
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
  const metricData: ShiftGmMetricData = {
    metricType: "shiftGM",
    requestId: getRequestId(),
    fromMarketAddress: fromMarketInfo?.marketTokenAddress,
    fromMarketName: fromMarketInfo?.name,
    toMarketName: toMarketInfo?.name,
    toMarketAddress: toMarketInfo?.marketTokenAddress,
    minToMarketTokenAmount: formatAmountForMetrics(minMarketTokenAmount, marketToken?.decimals),
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
  };
  const metricId = getShiftGMMetricId(metricData);

  metrics.setCachedMetricData(metricId, metricData);

  return {
    metricData,
    metricId,
  };
}

export function getGMSwapMetricId(p: {
  initialLongTokenAddress: string | undefined;
  initialShortTokenAddress: string | undefined;
  marketAddress: string | undefined;
  marketTokenAmount: bigint | undefined;
}) {
  return [
    "GMSwap",
    p.initialLongTokenAddress || "initialLongTokenAddress",
    p.initialShortTokenAddress || "initialShortTokenAddress",
    p.marketAddress || "marketTokenAddress",
    p.marketTokenAmount?.toString || "marketTokenAmount",
  ].join(":");
}

export function getShiftGMMetricId(p: { fromMarketAddress: string | undefined; toMarketAddress: string | undefined }) {
  return ["shiftGM", p.fromMarketAddress || "fromMarketAddress", p.toMarketAddress || "toMarketAddress"].join(":");
}

export function getSwapOrderMetricId(p: {
  initialCollateralTokenAddress: string | undefined;
  swapPath: string[] | undefined;
  orderType: OrderType | undefined;
  initialCollateralDeltaAmount: bigint | undefined;
  minOutputAmount: bigint | undefined;
}) {
  return [
    "swap",
    p.initialCollateralTokenAddress || "initialColltateralTokenAddress",
    p.swapPath?.join("-") || "swapPath",
    p.orderType || "orderType",
    p.initialCollateralDeltaAmount?.toString() || "initialCollateralDeltaAmount",
    p.minOutputAmount?.toString() || "minOutputAmount",
  ].join(":");
}

export function getPositionOrderMetricId(p: {
  marketAddress: string | undefined;
  initialCollateralTokenAddress: string | undefined;
  swapPath: string[] | undefined;
  isLong: boolean | undefined;
  orderType: OrderType | undefined;
  sizeDeltaUsd: bigint | undefined;
  initialCollateralDeltaAmount: bigint | undefined;
}) {
  return [
    "position",
    p.marketAddress || "marketAddress",
    p.initialCollateralTokenAddress || "initialCollateralTokenAddress",
    p.swapPath?.join("-") || "swapPath",
    p.isLong || "isLong",
    p.orderType || "orderType",
    p.sizeDeltaUsd?.toString() || "sizeDeltaUsd",
    p.initialCollateralDeltaAmount?.toString() || "initialCollateralDeltaAmount",
  ].join(":");
}

export function sendOrderSubmittedMetric(metricId: string, metricType: OrderMetricType) {
  metrics.pushEvent({
    event: `${metricType}.submitted`,
    isError: false,
    data: metrics.getCachedMetricData(metricId),
  });
}

export function sendTxnValidationErrorMetric(metricId: string, metricType: OrderMetricType) {
  metrics.pushEvent({
    event: `${metricType}.failed`,
    isError: true,
    data: {
      errorContext: "submit",
      errorMessage: "Error submitting order, missed data",
      ...(metrics.getCachedMetricData(metricId, true) || {}),
    } as MetricData,
  });
}

export function makeTxnSentMetricsHandler(metricId: string, metricType: OrderMetricType) {
  return () => {
    metrics.startTimer(metricId);

    metrics.pushEvent({
      event: `${metricType}.sent`,
      isError: false,
      time: metrics.getTime(metricId),
      data: metrics.getCachedMetricData(metricId),
    });

    return Promise.resolve();
  };
}

export function makeTxnErrorMetricsHandler(metricId: string, metricType: OrderMetricType) {
  return (error: Error | TxError) => {
    const errorData = prepareErrorMetricData(error);

    metrics.pushEvent({
      event: `${metricType}.${errorData?.isUserRejectedError ? "rejected" : "failed"}`,
      isError: true,
      data: {
        errorContext: "sending",
        ...(errorData || {}),
        ...(metrics.getCachedMetricData(metricId, true) || {}),
      },
    });

    throw error;
  };
}

export function sendOrderCreatedMetric(metricId: string, metricType: OrderMetricType) {
  const metricData = metrics.getCachedMetricData(metricId);
  metrics.pushEvent({
    event: `${metricType}.created`,
    isError: false,
    time: metrics.getTime(metricId),
    data: metricData,
  });
}

export function sendOrderExecutedMetric(metricId: string, metricType: OrderMetricType) {
  const metricData = metrics.getCachedMetricData(metricId, true);

  metrics.pushEvent({
    event: `${metricType}.executed`,
    isError: false,
    time: metrics.getTime(metricId, true),
    data: metricData,
  });
}

export function sendOrderCancelledMetric(metricId: string, metricType: OrderMetricType, eventData: EventLogData) {
  const metricData = metrics.getCachedMetricData(metricId, true);

  if (!metricData) {
    return;
  }

  metrics.pushEvent({
    event: `${metricType}.failed`,
    isError: true,
    time: metrics.getTime(metricId, true),
    data: {
      ...(metricData || {}),
      errorMessage: `${metricType} cancelled`,
      reason: eventData.stringItems.items.reason,
      errorContext: "execution",
    } as ErrorMetricData,
  });
}

export function formatAmountForMetrics(amount?: bigint, decimals = USD_DECIMALS) {
  if (amount === undefined) {
    return undefined;
  }

  return formatTokenAmount(roundToOrder(amount), decimals);
}

export function getRequestId() {
  return `${Date.now()}_${Math.round(Math.random() * 10000000)}`;
}
