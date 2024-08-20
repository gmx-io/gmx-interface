import { EventLogData } from "context/SyntheticsEvents";
import { OrderType } from "domain/synthetics/orders";
import { TxError } from "lib/contracts/transactionErrors";
import { USD_DECIMALS } from "lib/legacy";
import { formatTokenAmount, roundToOrder } from "lib/numbers";
import { prepareErrorMetricData } from "./errorReporting";
import { MetricsContextType } from "./MetricsContext";
import { OrderMetricType } from "./types";

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

export function sendOrderSubmittedMetric(metrics: MetricsContextType, metricId: string, metricType: OrderMetricType) {
  metrics.sendMetric({
    event: `${metricType}.submitted`,
    isError: false,
    data: metrics.getCachedMetricData(metricId),
  });
}

export function sendTxnValidationErrorMetric(
  metrics: MetricsContextType,
  metricId: string,
  metricType: OrderMetricType
) {
  metrics.sendMetric({
    event: `${metricType}.failed`,
    isError: true,
    data: {
      errorContext: "submit",
      errorMessage: "Error submitting order, missed data",
      ...(metrics.getCachedMetricData(metricId, true) || {}),
    },
  });
}

export function getTxnSentMetricsHandler(metrics: MetricsContextType, metricId: string, metricType: OrderMetricType) {
  return () => {
    metrics.startTimer(metricId);

    metrics.sendMetric({
      event: `${metricType}.sent`,
      isError: false,
      time: metrics.getTime(metricId),
      data: metrics.getCachedMetricData(metricId),
    });

    return Promise.resolve();
  };
}

export function getTxnErrorMetricsHandler(metrics: MetricsContextType, metricId: string, metricType: OrderMetricType) {
  return (error: Error | TxError) => {
    const errorData = prepareErrorMetricData(error);

    metrics.sendMetric({
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

export function sendOrderCreatedMetric(metrics: MetricsContextType, metricId: string, metricType: OrderMetricType) {
  const metricData = metrics.getCachedMetricData(metricId);

  if (!metricData) {
    return;
  }

  metrics.sendMetric({
    event: `${metricType}.created`,
    isError: false,
    time: metrics.getTime(metricId),
    data: metricData,
  });
}

export function sendOrderExecutedMetric(metrics: MetricsContextType, metricId: string, metricType: OrderMetricType) {
  const metricData = metrics.getCachedMetricData(metricId, true);

  if (!metricData) {
    return;
  }

  metrics.sendMetric({
    event: `${metricType}.executed`,
    isError: false,
    time: metrics.getTime(metricId, true),
    data: metricData,
  });
}

export function sendOrderCancelledMetric(
  metrics: MetricsContextType,
  metricId: string,
  metricType: OrderMetricType,
  eventData: EventLogData
) {
  const metricData = metrics.getCachedMetricData(metricId, true);

  if (!metricData) {
    return;
  }

  metrics.sendMetric({
    event: `${metricType}.failed`,
    isError: true,
    time: metrics.getTime(metricId, true),
    data: {
      ...(metricData || {}),
      errorMessage: `${metricType} cancelled`,
      reason: eventData.stringItems.items.reason,
      errorContext: "execution",
    },
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
