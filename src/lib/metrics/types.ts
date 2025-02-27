import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { ErrorData } from "lib/parseError";

export type GlobalMetricData = {
  isMobileMetamask: boolean;
  isWindowVisible: boolean;
  isAuthorised: boolean;
  isLargeAccount: boolean;
  abFlags: Record<string, boolean>;
  isMobile: boolean;
  isHomeSite: boolean;
  browserName?: string;
  browserVersion?: string;
  platform?: string;
  isInited?: boolean;
};

export enum OrderStage {
  Submitted = "submitted",
  Simulated = "simulated",
  TxnSubmitted = "txnSubmitted",
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

export type MeasureMetricType =
  | "positionsListLoad"
  | "marketsInfoLoad"
  | "multicall"
  | "candlesLoad"
  | "candlesDisplay"
  | "tradingDataLoad"
  | "accountInfo"
  | "syntheticsPage";

export type OrderMetricType =
  | SwapMetricData["metricType"]
  | IncreaseOrderMetricData["metricType"]
  | DecreaseOrderMetricData["metricType"]
  | EditCollateralMetricData["metricType"]
  | SwapGmMetricData["metricType"]
  | SwapGLVMetricData["metricType"]
  | ShiftGmMetricData["metricType"];

export type OrderErrorContext =
  | "simulation"
  | "gasLimit"
  | "gasPrice"
  | "bestNonce"
  | "sending"
  | "pending"
  | "minting"
  | "execution";

export type OrderEventName = `${OrderMetricType}.${OrderStage}`;
export type MeasureEventName = `${MeasureMetricType}.${LoadingStage}`;

export type OrderMetricId = OrderMetricData["metricId"];

export type OrderMetricData =
  | SwapMetricData
  | IncreaseOrderMetricData
  | DecreaseOrderMetricData
  | EditCollateralMetricData
  | SwapGmMetricData
  | SwapGLVMetricData
  | ShiftGmMetricData;

// General metrics
export type OpenAppEvent = {
  event: "openApp";
  isError: false;
  data: {
    isRefreshed: boolean;
  };
};

export type AccountInitedEvent = {
  event: "accountInited";
  isError: false;
  data: {};
};

// Websockets
export type WsProviderConnected = {
  event: "wsProvider.connected";
  isError: false;
  data: {};
};

export type WsProviderDisconnected = {
  event: "wsProvider.disconnected";
  isError: false;
  data: {};
};

export type WsProviderHealthCheckFailed = {
  event: "wsProvider.healthCheckFailed";
  isError: false;
  data: {
    requiredListenerCount: number;
    listenerCount: number;
  };
};

// Loading measurements
export type LoadingStartEvent = {
  event: `${MeasureMetricType}.${LoadingStage.Started}`;
  isError: false;
  time?: number;
  data: {
    requestId: string;
    isFirstTimeLoad?: boolean;
  };
};

export type LoadingSuccessEvent = {
  event: `${MeasureMetricType}.${LoadingStage.Success}`;
  isError: false;
  time: number | undefined;
  data: {
    requestId: string;
    isFirstTimeLoad?: boolean;
  };
};

export type LoadingTimeoutEvent = {
  event: `${MeasureMetricType}.${LoadingStage.Timeout}`;
  isError: true;
  time: number | undefined;
  data: {
    requestId: string;
    isFirstTimeLoad?: boolean;
  };
};

export type LoadingFailedEvent = {
  event: `${MeasureMetricType}.${LoadingStage.Failed}`;
  isError: true;
  time: number | undefined;
  data: {
    requestId: string;
    isFirstTimeLoad?: boolean;
  } & ErrorData;
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
  data: OrderMetricData & ErrorData;
};

export type OrderSentEvent = {
  event: `${OrderMetricType}.${OrderStage.Sent}`;
  isError: false;
  time: number | undefined;
  data: OrderMetricData;
};

export type OrderSimulatedEvent = {
  event: `${OrderMetricType}.${OrderStage.Simulated}`;
  isError: false;
  time: number;
  data: OrderMetricData;
};

export type OrderTxnSubmittedEvent = {
  event: `${OrderMetricType}.${OrderStage.TxnSubmitted}`;
  isError: false;
  time: number;
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
  data: OrderMetricData & ErrorData;
};

export type PendingTxnErrorEvent = {
  event: `${OrderMetricType}.${OrderStage.Failed}`;
  isError: true;
  time: number | undefined;
  data: OrderMetricData & ErrorData;
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
  data: OrderMetricData & ErrorData;
};

// Multicall tracking
export type MulticallTimeoutEvent = {
  event: "multicall.timeout";
  isError: true;
  data: {
    metricType: "rpcTimeout" | "multicallTimeout" | "workerTimeout";
    isInMainThread: boolean;
    requestType?: "initial" | "retry";
    rpcProvider?: string;
    isLargeAccount?: boolean;
    errorMessage: string;
  };
};

export type MulticallErrorEvent = {
  event: "multicall.error";
  isError: true;
  data: {
    isInMainThread: boolean;
    rpcProvider?: string;
    requestType?: "initial" | "retry";
    isLargeAccount?: boolean;
    errorMessage: string;
  };
};

// Error tracking
export type ErrorEvent = {
  event: "error";
  isError: true;
  data: ErrorData;
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
  initialCollateralAllowance: string | undefined;
  initialCollateralBalance: string | undefined;
  toTokenAddress: string | undefined;
  toTokenSymbol: string | undefined;
  initialCollateralDeltaAmount: number | undefined;
  minOutputAmount: number | undefined;
  swapPath: string[] | undefined;
  executionFee: number | undefined;
  allowedSlippage: number | undefined;
  orderType: OrderType | undefined;
  isFirstOrder: boolean | undefined;
  amountUsd: number | undefined;
};

export type IncreaseOrderMetricData = PositionOrderMetricParams & {
  metricId: `position:${string}`;
  metricType: "increasePosition" | "limitOrder";
  leverage: string | undefined;
  isFirstOrder: boolean | undefined;
  isLeverageEnabled: boolean | undefined;
  initialCollateralAllowance: string | undefined;
  initialCollateralBalance: string | undefined;
  isTPSLCreated: boolean | undefined;
  slCount: number | undefined;
  tpCount: number | undefined;
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
  marketIndexName: string | undefined;
  marketPoolName: string | undefined;
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
  priceImpactDeltaUsd: number | undefined;
  priceImpactPercentage: number | undefined;
  netRate1h: number | undefined;
  interactionId: string | undefined;
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
  marketTokenUsd: number | undefined;
  isFirstBuy: boolean | undefined;
};

export type ShiftGmMetricData = {
  metricId: `shift:${string}`;
  metricType: "shiftGM";
  requestId: string;
  fromMarketAddress: string | undefined;
  toMarketAddress: string | undefined;
  minToMarketTokenAmount: number | undefined;
  executionFee: number | undefined;
};

export type SwapGLVMetricData = {
  metricId: `glv:${string}`;
  metricType: "buyGLV" | "sellGLV";
  requestId: string;
  initialLongTokenAddress: string | undefined;
  initialShortTokenAddress: string | undefined;
  glvAddress: string | undefined;
  selectedMarketForGlv: string | undefined;
  marketName: string | undefined;
  executionFee: number | undefined;
  longTokenAmount: number | undefined;
  shortTokenAmount: number | undefined;
  glvTokenAmount: number | undefined;
  glvTokenUsd: number | undefined;
  isFirstBuy: boolean | undefined;
};

// Missed coins
export type MissedCoinEvent = {
  event: "missedCoin.search" | "missedCoin.popup";
  isError: false;
  data: {
    coin: string;
    totalVolume: number | undefined;
    monthVolume: number | undefined;
    place: MissedCoinsPlace;
    account?: string;
  };
};

// Timings
export type LongTaskTiming = { event: "longtasks.self.timing"; data: { isInitialLoad: boolean } };

export type MulticallBatchedTiming = {
  event: "multicall.batched.timing";
  data: {
    priority: string;
  };
};

export type MulticallRequestTiming = {
  event: "multicall.request.timing";
  data: {
    requestType: string;
    rpcProvider: string;
    isLargeAccount: boolean;
  };
};

// Counters
export type MulticallBatchedCallCounter = {
  event: "multicall.batched.call";
  data: {
    priority: string;
  };
};

export type MulticallBatchedErrorCounter = {
  event: "multicall.batched.error";
  data: {
    priority: string;
  };
};

export type MulticallRequestCounter = {
  event: `multicall.request.${"call" | "timeout" | "error"}`;
  data: {
    isInMainThread: boolean;
    requestType: string;
    rpcProvider: string;
    isLargeAccount: boolean;
  };
};

export type MulticallFallbackRpcModeCounter = {
  event: `multicall.fallbackRpcMode.${"on" | "off"}`;
  data: {
    isInMainThread: boolean;
  };
};

export type RpcTrackerRankingCounter = {
  event: "rpcTracker.ranking.setBestRpc";
  data: {
    rpcProvider: string;
    bestBlockGap: number | "unknown";
    isLargeAccount: boolean;
  };
};

export type RpcFailureCounter = {
  event: "rpcTracker.provider.failed";
  data: {
    rpcProvider: string;
  };
};

export type GetFeeDataBlockError = {
  event: "error.getFeeData.value.hash";
};

export type SetAutoCloseOrdersAction = {
  event: "announcement.autoCloseOrders.updateExistingOrders";
};
