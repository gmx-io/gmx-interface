import type { SourceChainId } from "config/chains";
import type { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import type { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import type { ErrorData } from "lib/errors";
import type { TradeMode } from "sdk/utils/trade/types";
import type { TwapDuration } from "sdk/utils/twap/types";

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
  srcChainId?: SourceChainId;
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

enum LoadingStage {
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
export type ViemWsClientConnected = {
  event: "viemWsClient.connected";
  isError: false;
  data: {
    chainId: number;
    rpcUrl: string;
  };
};

export type ViemWsClientDisconnected = {
  event: "viemWsClient.disconnected";
  isError: false;
  data: {
    chainId: number;
    rpcUrl: string;
  };
};

export type ViemWsClientError = {
  event: "viemWsClient.error";
  isError: true;
  data: {
    chainId: number;
    rpcUrl: string;
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

export enum FreshnessMetricId {
  Tickers = `tickers`,
  Candles = "candles",
  Prices24h = "24Prices",
  MarketsValues = "marketsValues",
  MarketsConfigs = "marketsConfigs",
  ApiMarketsInfo = "apiMarketsInfo",
  Positions = "positions",
  Orders = "orders",
  Balances = "balances",
}

export type FreshnessTiming = {
  event: `freshness.${FreshnessMetricId}`;
  data: {
    chainId: number;
    metricId: FreshnessMetricId;
  };
};

// Transactions tracking
export type SubmittedOrderEvent = {
  event: `${OrderMetricType}.${OrderStage.Submitted}`;
  isError: false;
  data: OrderMetricData;
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

// Fallback tracking
export type RpcTrackerEndpointBannedEvent = {
  event: "rpcTracker.endpoint.banned";
  isError: false;
  data: {
    chainId: number;
    chainName: string;
    endpoint: string;
    reason: string;
  };
};

export type RpcTrackerUpdateEndpointsEvent = {
  event: "rpcTracker.endpoint.updated";
  isError: false;
  data: {
    isOld: boolean;
    chainName: string;
    chainId: number;
    primary: string;
    secondary: string;
    primaryBlockGap: number | "unknown";
    secondaryBlockGap: number | "unknown";
  };
};

export type RpcTrackerEndpointTiming = {
  event: "rpcTracker.endpoint.timing";
  data: {
    endpoint: string;
    chainId: number;
  };
};

export type RpcTrackerEndpointBlockGapTiming = {
  event: "rpcTracker.endpoint.blockGap";
  data: {
    endpoint: string;
    chainId: number;
  };
};

export type OracleKeeperUpdateEndpointsEvent = {
  event: "oracleKeeper.endpoint.updated";
  isError: false;
  data: {
    chainId: number;
    chainName: string;
    primary: string;
    secondary: string;
  };
};

export type OracleKeeperEndpointBannedEvent = {
  event: "oracleKeeper.endpoint.banned";
  isError: false;
  data: {
    chainId: number;
    chainName: string;
    endpoint: string;
    reason: string;
  };
};

export type OracleKeeperFailureCounter = {
  // Keep it for compatibility with old events
  event: "oracleKeeper.failure";
  data: {
    chainId: number;
    method: string;
  };
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
  isExpressValid: boolean;
  isOutGasTokenBalance: boolean;
  needGasTokenApproval: boolean;
  isSubaccountValid: boolean | undefined;
  isSubbaccountExpired: boolean | undefined;
  isSubaccountActionsExceeded: boolean | undefined;
  isSubaccountNonceExpired: boolean | undefined;
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
  isTwap: boolean;
  executionFeeBufferBps: number | undefined;
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
  chainId: number;
  isCollateralFromMultichain: boolean;
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
  executionFeeBufferBps: number | undefined;
  swapPath: string[] | undefined;
  sizeDeltaUsd: number | undefined;
  sizeDeltaInTokens: number | undefined;
  isTwap: boolean;
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
  chainId: number;
  isCollateralFromMultichain: boolean;
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
  chainId: number;
  isCollateralFromMultichain: boolean;
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
    chainId: number;
    priority: string;
    callsCount: number;
  };
};

export type MulticallRequestTiming = {
  event: "multicall.request.timing";
  data: {
    chainId: number;
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
export type MissedMarketPricesCounter = {
  event: "missedMarketPrices";
  data: {
    marketName: string;
    source: string;
  };
};

export type TickersErrorsCounter = {
  event: "tickersErrors";
  data: {};
};

export type TickersPartialDataCounter = {
  event: "tickersPartialData";
  data: {};
};

export type MulticallBatchedCallCounter = {
  event: "multicall.batched.call";
  data: {
    chainId: number;
    priority: string;
    callsCount: number;
  };
};

export type MulticallBatchedErrorCounter = {
  event: "multicall.batched.error";
  data: {
    chainId: number;
    priority: string;
    callsCount: number;
  };
};

export type OpenOceanQuoteTiming = {
  event: "openOcean.quote.timing";
};

export type MulticallRequestCounter = {
  event: `multicall.request.${"call" | "timeout" | "error"}`;
  data: {
    chainId: number;
    isInMainThread: boolean;
    requestType: string;
    rpcProvider: string;
    isLargeAccount: boolean;
  };
};

export type GetFeeDataBlockError = {
  event: "error.getFeeData.value.hash";
};

export type SetAutoCloseOrdersAction = {
  event: "announcement.autoCloseOrders.updateExistingOrders";
};

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
