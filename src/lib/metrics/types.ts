import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { TxErrorType } from "lib/contracts/transactionErrors";

export type GlobalMetricData = {
  isMobileMetamask: boolean;
  isWindowVisible: boolean;
  isAuthorised: boolean;
  abFlags: Record<string, boolean>;
  isMobile: boolean;
  isHomeSite: boolean;
};

export enum OrderStage {
  Submitted = "submitted",
  Sent = "sent",
  Created = "created",
  Executed = "executed",
  Rejected = "rejected",
  Failed = "failed",
}

export enum LoadingStage {
  Started = "started",
  Success = "success",
  Timeout = "timeout",
  Failed = "failed",
}

export type MeasureMetricType = "positionsListLoad" | "multicall";

export type OrderMetricType =
  | SwapMetricData["metricType"]
  | IncreaseOrderMetricData["metricType"]
  | DecreaseOrderMetricData["metricType"]
  | EditCollateralMetricData["metricType"]
  | SwapGmMetricData["metricType"]
  | ShiftGmMetricData["metricType"];

export type OrderEventName = `${OrderMetricType}.${OrderStage}`;
export type MeasureEventName = `${MeasureMetricType}.${LoadingStage}`;

export type OrderMetricId = OrderMetricData["metricId"];

export type OrderMetricData =
  | SwapMetricData
  | IncreaseOrderMetricData
  | DecreaseOrderMetricData
  | EditCollateralMetricData
  | SwapGmMetricData
  | ShiftGmMetricData;

// Loading measurements
export type LoadingStartEvent = {
  event: `${MeasureMetricType}.${LoadingStage.Started}`;
  isError: false;
  data: {
    requestId: string;
  };
};

export type LoadingSuccessEvent = {
  event: `${MeasureMetricType}.${LoadingStage.Success}`;
  isError: false;
  time: number | undefined;
  data: {
    requestId: string;
  };
};

export type LoadingTimeoutEvent = {
  event: `${MeasureMetricType}.${LoadingStage.Timeout}`;
  isError: true;
  time: number | undefined;
  data: {
    requestId: string;
  };
};

export type LoadingFailedEvent = {
  event: `${MeasureMetricType}.${LoadingStage.Failed}`;
  isError: true;
  time: number | undefined;
  data: {
    requestId: string;
  } & ErrorMetricData;
};

// Transactions tracking
export type SubmittedOrderEvent = {
  event: `${OrderMetricType}.${OrderStage.Submitted}`;
  isError: false;
  data: OrderMetricData;
};

export type ValidationErrorEvent = {
  event: `${OrderMetricType}.${OrderStage.Failed}`;
  isError: true;
  data: OrderMetricData & ErrorMetricData;
};

export type OrderSentEvent = {
  event: `${OrderMetricType}.${OrderStage.Sent}`;
  isError: false;
  time: number | undefined;
  data: OrderMetricData;
};

export type OrderCreatedEvent = {
  event: `${OrderMetricType}.${OrderStage.Created}`;
  isError: false;
  time: number | undefined;
  data: OrderMetricData;
};

export type OrderTxnFailedEvent = {
  event: `${OrderMetricType}.${OrderStage.Failed | OrderStage.Rejected}`;
  isError: true;
  data: OrderMetricData & ErrorMetricData;
};

export type PendingTxnErrorEvent = {
  event: `${OrderMetricType}.${OrderStage.Failed}`;
  isError: true;
  time: number | undefined;
  data: OrderMetricData & ErrorMetricData;
};

export type OrderExecutedEvent = {
  event: `${OrderMetricType}.${OrderStage.Executed}`;
  isError: false;
  time: number | undefined;
  data: OrderMetricData;
};

export type OrderCancelledEvent = {
  event: `${OrderMetricType}.${OrderStage.Failed}`;
  isError: true;
  time: number | undefined;
  data: OrderMetricData & ErrorMetricData;
};

// Multicall tracking
export type MulticallTimeoutEvent = {
  event: "multicall.timeout";
  isError: true;
  data: {
    metricType: "rpcTimeout" | "multicallTimeout" | "workerTimeout";
    isInMainThread: boolean;
    isFallbackRequest?: boolean;
    errorMessage: string;
  };
};

export type MulticallErrorEvent = {
  event: "multicall.error";
  isError: true;
  data: {
    isInMainThread: boolean;
    isFallbackRequest?: boolean;
    errorMessage: string;
  };
};

// Error tracking
export type ErrorEvent = {
  event: "error";
  isError: true;
  data: ErrorMetricData;
};

// Entities metric data
export type SwapMetricData = {
  metricId: `swap:${string}`;
  metricType: "swap" | "limitSwap";
  requestId: string;
  is1ct: boolean;
  hasReferralCode: boolean | undefined;
  initialCollateralTokenAddress: string | undefined;
  initialCollateralSymbol: string | undefined;
  toTokenAddress: string | undefined;
  toTokenSymbol: string | undefined;
  initialCollateralDeltaAmount: number | undefined;
  minOutputAmount: number | undefined;
  swapPath: string[] | undefined;
  executionFee: number | undefined;
  allowedSlippage: number | undefined;
  orderType: OrderType | undefined;
};

export type IncreaseOrderMetricData = PositionOrderMetricParams & {
  metricId: `position:${string}`;
  metricType: "increasePosition" | "limitOrder";
};

export type DecreaseOrderMetricData = PositionOrderMetricParams & {
  metricId: `position:${string}`;
  metricType: "decreasePosition" | "takeProfitOrder" | "stopLossOrder";
  place: "tradeBox" | "positionSeller";
  isFullClose: boolean | undefined;
  decreaseSwapType: DecreasePositionSwapType | undefined;
  isStandalone: boolean | undefined;
};

export type PositionOrderMetricParams = {
  hasExistingPosition: boolean | undefined;
  hasReferralCode: boolean | undefined;
  marketAddress: string | undefined;
  marketName: string | undefined;
  initialCollateralTokenAddress: string | undefined;
  initialCollateralSymbol: string | undefined;
  initialCollateralDeltaAmount: number | undefined;
  swapPath: string[] | undefined;
  sizeDeltaUsd: number | undefined;
  sizeDeltaInTokens: number | undefined;
  triggerPrice: number | undefined;
  acceptablePrice: number | undefined;
  isLong: boolean | undefined;
  orderType: OrderType | undefined;
  executionFee: number | undefined;
  is1ct: boolean;
  requestId: string;
};

export type EditCollateralMetricData = {
  metricId: `position:${string}`;
  metricType: "depositCollateral" | "withdrawCollateral";
  is1ct: boolean;
  requestId: string;
  marketAddress: string | undefined;
  isStandalone: boolean | undefined;
  marketName: string | undefined;
  initialCollateralTokenAddress: string | undefined;
  initialCollateralSymbol: string | undefined;
  initialCollateralDeltaAmount: number | undefined;
  swapPath: [];
  isLong: boolean | undefined;
  orderType: OrderType | undefined;
  executionFee: number | undefined;
};

export type SwapGmMetricData = {
  metricId: `gm:${string}`;
  metricType: "buyGM" | "sellGM";
  requestId: string;
  initialLongTokenAddress: string | undefined;
  initialShortTokenAddress: string | undefined;
  marketAddress: string | undefined;
  marketName: string | undefined;
  executionFee: number | undefined;
  longTokenAmount: number | undefined;
  shortTokenAmount: number | undefined;
  marketTokenAmount: number | undefined;
};

export type ShiftGmMetricData = {
  metricId: `shift:${string}`;
  metricType: "shiftGM";
  requestId: string;
  fromMarketAddress: string | undefined;
  fromMarketName: string | undefined;
  toMarketAddress: string | undefined;
  toMarketName: string | undefined;
  minToMarketTokenAmount: number | undefined;
  executionFee: number | undefined;
};

export type ErrorMetricData = {
  errorContext?: string;
  errorMessage?: string;
  errorStack?: string;
  errorStackHash?: string;
  errorName?: string;
  contractError?: string;
  isUserError?: boolean;
  isUserRejectedError?: boolean;
  reason?: string;
  txErrorType?: TxErrorType;
  txErrorData?: unknown;
  errorSource?: string;
};
