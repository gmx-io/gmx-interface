import { OrderType } from "domain/synthetics/orders";
import { extractError, isUserRejectedActionError, TxError } from "lib/contracts/transactionErrors";
import { MetricsContextType } from "./MetricsContext";

export type MetricEventType = OrderEventType | "positionsListLoad.success";
export type MetricData = OrderMetricData | OrderWsEventMetricData | PendingTxnErrorMetricData;

export type OrderEventType = `${OrderMetricType}.${OrderStageType}`;
export type OrderStageType = "submitted" | "sent" | "created" | "executed" | "cancelled" | "rejected" | "failed";

export type OrderMetricType =
  | SwapMetricParams["metricType"]
  | IncreaseOrderMetricParams["metricType"]
  | DecreaseOrderMetricParams["metricType"]
  | EditCollateralMetricParams["metricType"]
  | "unknownTxn";

export type OrderMetricData =
  | SwapMetricParams
  | IncreaseOrderMetricParams
  | DecreaseOrderMetricParams
  | EditCollateralMetricParams;

export type OrderWsEventMetricData = (SwapMetricParams | IncreaseOrderMetricParams | DecreaseOrderMetricParams) & {
  key: string;
  txnHash: string;
};

export type PendingTxnErrorMetricData = {
  metricType: OrderMetricType;
  txnHash: string;
};

export type SwapMetricParams = {
  metricType: "swap" | "limitSwap";
  account: string | undefined;
  initialCollateralTokenAddress: string | undefined;
  toTokenAddress: string | undefined;
  initialCollateralDeltaAmount: bigint | undefined;
  minOutputAmount: bigint | undefined;
  swapPath: string[] | undefined;
  executionFee: bigint | undefined;
  allowedSlippage: number | undefined;
  orderType: OrderType | undefined;
};

export type PositionOrderMetricParams = {
  account: string | undefined;
  referralCodeForTxn: string | undefined;
  hasExistingPosition: boolean | undefined;
  marketAddress: string | undefined;
  initialCollateralTokenAddress: string | undefined;
  initialCollateralDeltaAmount: bigint | undefined;
  swapPath: string[] | undefined;
  sizeDeltaUsd: bigint | undefined;
  sizeDeltaInTokens: bigint | undefined;
  triggerPrice: bigint | undefined;
  acceptablePrice: bigint | undefined;
  isLong: boolean | undefined;
  orderType: OrderType | undefined;
  executionFee: bigint | undefined;
};

export type IncreaseOrderMetricParams = {
  metricType: "increasePosition" | "limitOrder";
} & PositionOrderMetricParams;

export type DecreaseOrderMetricParams = {
  metricType: "decreasePosition" | "takeProfitOrder" | "stopLossOrder";
  place: "tradeBox" | "positionSeller";
  isFullClose: boolean | undefined;
} & PositionOrderMetricParams;

export type EditCollateralMetricParams = {
  metricType: "depositCollateral" | "withdrawCollateral";
  account: string | undefined;
  marketAddress: string | undefined;
  initialCollateralTokenAddress: string | undefined;
  initialCollateralDeltaAmount: bigint | undefined;
  swapPath: [];
  isLong: boolean | undefined;
  orderType: OrderType | undefined;
  executionFee: bigint | undefined;
};

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
    fields: metrics.getCachedMetricData(metricId),
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
    fields: metrics.getCachedMetricData(metricId, true),
  });
}

export function getTxnSentMetricsHandler(metrics: MetricsContextType, metricId: string, metricType: OrderMetricType) {
  return () => {
    metrics.sendMetric({
      event: `${metricType}.sent`,
      isError: false,
      time: metrics.getTime(metricId),
      fields: metrics.getCachedMetricData(metricId),
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
      fields: metrics.getCachedMetricData(metricId, true),
    });

    throw error;
  };
}
