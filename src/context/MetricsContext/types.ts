import { TxErrorType } from "lib/contracts/transactionErrors";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";

export type MetricEventType = OrderEventType | PositionsListEventType | MulticallEventType;
export type MetricData = OrderMetricData | PendingTxnErrorMetricData | MulticallMetricData | ErrorMetricData;

export type MetricDataKey = string;

export type PositionsListEventType =
  | "positionsListLoad.started"
  | "positionsListLoad.success"
  | "positionsListLoad.timeout"
  | "positionsListLoad.failed";

export type MetricType =
  | "depositCollateral"
  | "withdrawCollateral"
  | "swap"
  | "limitSwap"
  | "increasePosition"
  | "decreasePosition"
  | "takeProfitOrder"
  | "stopLossOrder"
  | "limitOrder"
  | "unknownOrder"
  | "positionsList"
  | "buyGM"
  | "sellGM";

export type OrderEventType = `${OrderMetricType}.${OrderStageType}`;

export type OrderStageType = "submitted" | "sent" | "created" | "executed" | "cancelled" | "rejected" | "failed";
export type LoadingStageType = "started" | "success" | "timeout" | "failed";

export type OrderMetricType =
  | SwapMetricData["metricType"]
  | IncreaseOrderMetricData["metricType"]
  | DecreaseOrderMetricData["metricType"]
  | EditCollateralMetricData["metricType"]
  | SwapGmMetricData["metricType"]
  | ShiftGmMetricData["metricType"]
  | "unknownOrder";

export type OrderMetricData =
  | SwapMetricData
  | IncreaseOrderMetricData
  | DecreaseOrderMetricData
  | EditCollateralMetricData;

export type PendingTxnErrorMetricData = {
  metricType: OrderMetricType;
};

export type SwapMetricData = {
  is1ct: boolean;
  requestId: string;
  metricType: "swap" | "limitSwap";
  hasReferralCode: boolean | undefined;
  initialCollateralTokenAddress: string | undefined;
  initialCollateralSymbol: string | undefined;
  toTokenAddress: string | undefined;
  toTokenSymbol: string | undefined;
  initialCollateralDeltaAmount: string | undefined;
  minOutputAmount: string | undefined;
  swapPath: string[] | undefined;
  executionFee: string | undefined;
  allowedSlippage: number | undefined;
  orderType: OrderType | undefined;
};

export type PositionOrderMetricParams = {
  hasExistingPosition: boolean | undefined;
  marketAddress: string | undefined;
  marketName: string | undefined;
  hasReferralCode: boolean | undefined;
  initialCollateralTokenAddress: string | undefined;
  initialCollateralSymbol: string | undefined;
  initialCollateralDeltaAmount: string | undefined;
  swapPath: string[] | undefined;
  sizeDeltaUsd: string | undefined;
  sizeDeltaInTokens: string | undefined;
  triggerPrice: string | undefined;
  acceptablePrice: string | undefined;
  isLong: boolean | undefined;
  orderType: OrderType | undefined;
  executionFee: string | undefined;
  is1ct: boolean;
  requestId: string;
};

export type IncreaseOrderMetricData = {
  metricType: "increasePosition" | "limitOrder";
} & PositionOrderMetricParams;

export type DecreaseOrderMetricData = {
  metricType: "decreasePosition" | "takeProfitOrder" | "stopLossOrder";
  place: "tradeBox" | "positionSeller";
  isFullClose: boolean | undefined;
  decreaseSwapType: DecreasePositionSwapType | undefined;
  isStandalone: boolean | undefined;
} & PositionOrderMetricParams;

export type EditCollateralMetricData = {
  metricType: "depositCollateral" | "withdrawCollateral";
  marketAddress: string | undefined;
  isStandalone: boolean | undefined;
  marketName: string | undefined;
  initialCollateralTokenAddress: string | undefined;
  initialCollateralSymbol: string | undefined;
  initialCollateralDeltaAmount: string | undefined;
  swapPath: [];
  isLong: boolean | undefined;
  orderType: OrderType | undefined;
  executionFee: string | undefined;
  is1ct: boolean;
  requestId: string;
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

export type SwapGmMetricData = {
  metricType: "buyGM" | "sellGM";
  requestId: string;
  initialLongTokenAddress: string | undefined;
  initialShortTokenAddress: string | undefined;
  marketAddress: string | undefined;
  marketName: string | undefined;
  executionFee: string | undefined;
  longTokenAmount: string | undefined;
  shortTokenAmount: string | undefined;
  marketTokenAmount: string | undefined;
};

export type ShiftGmMetricData = {
  metricType: "shiftGM";
  requestId: string;
  fromMarketAddress: string | undefined;
  fromMarketName: string | undefined;
  toMarketAddress: string | undefined;
  toMarketName: string | undefined;
  minToMarketTokenAmount: string | undefined;
  executionFee: string | undefined;
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
  txErrorType?: TxErrorType;
  txErrorData?: any;
} & any;
