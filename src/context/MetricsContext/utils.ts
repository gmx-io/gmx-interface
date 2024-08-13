import { OrderType } from "domain/synthetics/orders";
import { extractError, isUserRejectedActionError, TxError } from "lib/contracts/transactionErrors";
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

export function getSwapOrderMetricId(p: {
  account: string | undefined;
  initialCollateralTokenAddress: string | undefined;
  initialCollateralDeltaAmount: bigint | undefined;
  swapPath: string[] | undefined;
  executionFee: bigint | undefined;
  orderType: OrderType | undefined;
}) {
  return [
    "swap",
    p.account || "account",
    p.initialCollateralTokenAddress || "initialColltateralTokenAddress",
    p.initialCollateralDeltaAmount?.toString() || "initialCollateralDeltaAmount",
    p.swapPath?.join("-") || "swapPath",
    p.executionFee?.toString() || "executionFee",
    p.orderType || "orderType",
  ].join(":");
}

export function getPositionOrderMetricId(p: {
  account: string | undefined;
  marketAddress: string | undefined;
  initialCollateralTokenAddress: string | undefined;
  initialCollateralDeltaAmount: bigint | undefined;
  swapPath: string[] | undefined;
  sizeDeltaUsd: bigint | undefined;
  isLong: boolean | undefined;
  orderType: OrderType | undefined;
  executionFee: bigint | undefined;
}) {
  return [
    "position",
    p.account || "account",
    p.marketAddress || "marketAddress",
    p.initialCollateralTokenAddress || "initialCollateralTokenAddress",
    p.initialCollateralDeltaAmount?.toString() || "initialCollateralDeltaAmount",
    p.swapPath?.join("-") || "swapPath",
    p.sizeDeltaUsd?.toString() || "sizeDeltaUsd",
    p.isLong || "isLong",
    p.orderType || "orderType",
    p.executionFee?.toString() || "executionFee",
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
    message: "Error submitting order, missed data",
    data: metrics.getCachedMetricData(metricId, true),
  });
}

export function getTxnSentMetricsHandler(metrics: MetricsContextType, metricId: string, metricType: OrderMetricType) {
  return () => {
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
    const [message] = extractError(error);

    metrics.sendMetric({
      event: `${metricType}.${isUserRejectedActionError(error as Error) ? "rejected" : "failed"}`,
      isError: true,
      message,
      data: metrics.getCachedMetricData(metricId, true),
    });

    throw error;
  };
}
