import type { OrderType } from "domain/synthetics/orders";

export type MetricEventType = OrderEventType | PositionsListEventType | MulticallEventType;
export type MetricData =
  | OrderMetricData
  | OrderWsEventMetricData
  | PendingTxnErrorMetricData
  | MulticallMetricData
  | PositionsListMetricData;

export type PositionsListEventType =
  | "positionsListLoad.started"
  | "positionsListLoad.success"
  | "positionsListLoad.timeout";

export type OrderEventType = `${OrderMetricType}.${OrderStageType}`;
export type OrderStageType = "submitted" | "sent" | "created" | "executed" | "cancelled" | "rejected" | "failed";

export type OrderMetricType =
  | SwapMetricData["metricType"]
  | IncreaseOrderMetricData["metricType"]
  | DecreaseOrderMetricData["metricType"]
  | EditCollateralMetricData["metricType"]
  | "unknownOrder";

export type OrderMetricData =
  | SwapMetricData
  | IncreaseOrderMetricData
  | DecreaseOrderMetricData
  | EditCollateralMetricData;

export type OrderWsEventMetricData = (SwapMetricData | IncreaseOrderMetricData | DecreaseOrderMetricData) & {
  key: string;
  txnHash: string;
};

export type PendingTxnErrorMetricData = {
  metricType: OrderMetricType;
  txnHash: string;
};

export type SwapMetricData = {
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

export type IncreaseOrderMetricData = {
  metricType: "increasePosition" | "limitOrder";
} & PositionOrderMetricParams;

export type DecreaseOrderMetricData = {
  metricType: "decreasePosition" | "takeProfitOrder" | "stopLossOrder";
  place: "tradeBox" | "positionSeller";
  isFullClose: boolean | undefined;
} & PositionOrderMetricParams;

export type EditCollateralMetricData = {
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

export type MulticallEventType = "multicall.timeout";

export type MulticallMetricData = {
  metricType: "rpcTimeout" | "workerTimeout";
  isInMainThread?: boolean;
};

export type PositionsListMetricData = {
  metricType?: undefined;
  testWorkersLogic: boolean;
  requestId: string;
};
