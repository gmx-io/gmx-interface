import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { ErrorData } from "lib/errors";
import { TradeMode } from "sdk/types/trade";
import { TwapDuration } from "sdk/types/twap";

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
  Signed = "signed",
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
  | ShiftGmMetricData["metricType"]
  | MultichainDepositMetricData["metricType"]
  | MultichainWithdrawalMetricData["metricType"];

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
  | ShiftGmMetricData
  | MultichainDepositMetricData
  | MultichainWithdrawalMetricData;

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

export type OrderStepTimings = {
  timeFromSubmitted: number;
  timeFromSimulated: number;
  timeFromTxnSubmitted: number;
  timeFromSent: number;
  timeFromCreated: number;
};

export type OrderSimulatedEvent = {
  event: `${OrderMetricType}.${OrderStage.Simulated}`;
  isError: false;
  time: number;
  data: OrderMetricData & OrderStepTimings;
};

export type OrderTxnSubmittedEvent = {
  event: `${OrderMetricType}.${OrderStage.TxnSubmitted}`;
  isError: false;
  time: number;
  data: OrderMetricData & OrderStepTimings;
};

export type OrderSentEvent = {
  event: `${OrderMetricType}.${OrderStage.Sent}`;
  isError: false;
  time: number | undefined;
  data: OrderMetricData & OrderStepTimings;
};

export type OrderCreatedEvent = {
  event: `${OrderMetricType}.${OrderStage.Created}`;
  isError: false;
  time: number | undefined;
  data: OrderMetricData & OrderStepTimings;
};

export type OrderTxnFailedEvent = {
  event: `${OrderMetricType}.${OrderStage.Failed | OrderStage.Rejected}`;
  isError: true;
  data: Partial<OrderMetricData & ErrorData & OrderStepTimings>;
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

export type ExpressOrderMetricData = {
  isSponsoredCall: boolean;
  approximateGasLimit: number;
  approximateL1GasLimit: number;
  gasPrice: number;
  asyncGasLimit: number | undefined;
  currentGasLimit: number;
  currentEstimationMethod: string;
  gasPaymentToken: string;
};

// Entities metric data
export type SwapMetricData = {
  metricId: `swap:${string}`;
  metricType: "swap" | "limitSwap" | "twapSwap";
  requestId: string;
  isExpress: boolean;
  isExpress1CT: boolean;
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
  duration: TwapDuration | undefined;
  partsCount: number | undefined;
  tradeMode: TradeMode | undefined;
  expressData: ExpressOrderMetricData | undefined;
};

export type IncreaseOrderMetricData = PositionOrderMetricParams & {
  metricId: `position:${string}`;
  metricType: "increasePosition" | "limitOrder" | "twapIncreaseOrder";
  leverage: string | undefined;
  isFirstOrder: boolean | undefined;
  isLeverageEnabled: boolean | undefined;
  initialCollateralAllowance: string | undefined;
  initialCollateralBalance: string | undefined;
  isTPSLCreated: boolean | undefined;
  slCount: number | undefined;
  tpCount: number | undefined;
  internalSwapTotalFeesBps: number | undefined;
  internalSwapTotalFeesDeltaUsd: number | undefined;
  externalSwapInTokenAddress: string | undefined;
  externalSwapOutTokenAddress: string | undefined;
  externalSwapUsdIn: number | undefined;
  externalSwapUsdOut: number | undefined;
  externalSwapFeesUsd: number | undefined;
};

export type DecreaseOrderMetricData = PositionOrderMetricParams & {
  metricId: `position:${string}`;
  metricType: "decreasePosition" | "takeProfitOrder" | "stopLossOrder" | "twapDecreaseOrder";
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
  isExpress: boolean;
  isExpress1CT: boolean;
  requestId: string;
  priceImpactDeltaUsd: number | undefined;
  priceImpactPercentage: number | undefined;
  netRate1h: number | undefined;
  interactionId: string | undefined;
  duration: TwapDuration | undefined;
  partsCount: number | undefined;
  tradeMode: TradeMode | undefined;
  expressData: ExpressOrderMetricData | undefined;
};

export type EditCollateralMetricData = {
  metricId: `position:${string}`;
  metricType: "depositCollateral" | "withdrawCollateral";
  isExpress: boolean;
  isExpress1CT: boolean;
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
  expressData: ExpressOrderMetricData | undefined;
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

export type GelatoPollingTiming = {
  event: "express.pollGelatoTask.finalStatus";
  data: {
    status: string;
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

export type OpenOceanQuoteTiming = {
  event: "openOcean.quote.timing";
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

export type GetFeeDataBlockError = {
  event: "error.getFeeData.value.hash";
};

export type SetAutoCloseOrdersAction = {
  event: "announcement.autoCloseOrders.updateExistingOrders";
};

// 1. To measure share of succesfull Deposits and Deposit time: Add new events in Datadog: multichainDeposit, multichainWithdrawal. Events should follow the same scheme as “increasePosition” events (executed, submitted and etc).
//  Additionally, It should have fields for:
//     1. SourceChain / TargetChain (chain that asset is deposited or, withdrawn to)
//     2. Asset (BTC, ETH, USDC, etc)
//     3. Size In usd
//     4. Is First Deposit

type MultichainFundingParams = {
  sourceChain: number;
  settlementChain: number;
  assetSymbol: string;
  sizeInUsd: number;
};

export type MultichainDepositMetricData = MultichainFundingParams & {
  metricId: `multichainDeposit:${string}`;
  metricType: "multichainDeposit";
  isFirstDeposit: boolean;
};

export type MultichainWithdrawalMetricData = MultichainFundingParams & {
  metricId: `multichainWithdrawal:${string}`;
  metricType: "multichainWithdrawal";
  isFirstWithdrawal: boolean;
};

export type MultichainDepositEvent = {
  event: "multichainDeposit";
  isError: false;
  data: MultichainDepositMetricData;
};

export type MultichainWithdrawalEvent = {
  event: "multichainWithdrawal";
  isError: false;
  data: MultichainWithdrawalMetricData;
};
