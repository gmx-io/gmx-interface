import { USD_DECIMALS } from "config/factors";
import type {
  DepositCreatedEventData,
  EventLogData,
  GLVDepositCreatedEventData,
  OrderCreatedEventData,
  ShiftCreatedEventData,
  WithdrawalCreatedEventData,
} from "context/SyntheticsEvents";
import { ExpressTxnParams } from "domain/synthetics/express";
import { ExecutionFee } from "domain/synthetics/fees";
import {
  getMarketIndexName,
  getMarketPoolName,
  MarketInfo,
  RawCreateDepositParams,
  RawCreateGlvDepositParams,
  RawCreateGlvWithdrawalParams,
  RawCreateWithdrawalParams,
} from "domain/synthetics/markets";
import { OrderType } from "domain/synthetics/orders";
import { Subaccount } from "domain/synthetics/subaccount";
import { TokenData } from "domain/synthetics/tokens";
import { DecreasePositionAmounts, IncreasePositionAmounts, SwapAmounts, TradeMode } from "domain/synthetics/trade";
import { ErrorLike, extendError, OrderErrorContext, parseError } from "lib/errors";
import { bigintToNumber, formatPercentage, formatRatePercentage, getBasisPoints, roundToOrder } from "lib/numbers";
import { getToken } from "sdk/configs/tokens";
import { isDecreaseOrderType } from "sdk/utils/orders";
import { CreateOrderPayload } from "sdk/utils/orderTransactions";
import { TwapDuration } from "sdk/utils/twap/types";

import { metrics, SubmittedOrderEvent } from ".";
import {
  expectOrderCreations,
  markOrderCreationsFailed,
  markOrderCreationsSent,
  pruneOrderTracking,
  takeCreatedOrderMetricId,
  trackCreatedOrder,
} from "./orderCreationTracking";
import {
  DecreaseOrderMetricData,
  EditCollateralMetricData,
  ExpressOrderMetricData,
  IncreaseOrderMetricData,
  MultichainDepositMetricData,
  MultichainWithdrawalMetricData,
  OrderCancelledEvent,
  OrderCreatedEvent,
  OrderExecutedEvent,
  OrderMetricData,
  OrderMetricId,
  OrderSentEvent,
  OrderSimulatedEvent,
  OrderStage,
  OrderStepTimings,
  OrderTxnFailedEvent,
  OrderTxnSubmittedEvent,
  ShiftGmMetricData,
  SwapGLVMetricData,
  SwapGmMetricData,
  SwapMetricData,
} from "./types";

export function initSwapMetricData({
  fromToken,
  toToken,
  swapAmounts,
  initialCollateralAllowance,
  executionFee,
  orderType,
  hasReferralCode,
  subaccount,
  allowedSlippage,
  isFirstOrder,
  isExpress,
  isTwap,
  duration,
  executionFeeBufferBps,
  partsCount,
  tradeMode,
  expressParams,
  asyncExpressParams,
  fastExpressParams,
  chainId,
  isCollateralFromMultichain,
  orderPayloads,
}: {
  fromToken: TokenData | undefined;
  toToken: TokenData | undefined;
  swapAmounts: SwapAmounts | undefined;
  initialCollateralAllowance: bigint | undefined;
  executionFee: ExecutionFee | undefined;
  orderType: OrderType | undefined;
  allowedSlippage: number | undefined;
  hasReferralCode: boolean | undefined;
  subaccount: Subaccount | undefined;
  isTwap: boolean;
  executionFeeBufferBps: number | undefined;
  isExpress: boolean | undefined;
  isFirstOrder: boolean | undefined;
  duration: TwapDuration | undefined;
  partsCount: number | undefined;
  tradeMode: TradeMode | undefined;
  expressParams: ExpressTxnParams | undefined;
  asyncExpressParams: ExpressTxnParams | undefined;
  fastExpressParams: ExpressTxnParams | undefined;
  chainId: number;
  isCollateralFromMultichain: boolean;
  orderPayloads: CreateOrderPayload[] | undefined;
}) {
  let metricType: SwapMetricData["metricType"] = "swap";
  if (tradeMode === TradeMode.Twap) {
    metricType = "twapSwap";
  } else if (orderType === OrderType.LimitSwap) {
    metricType = "limitSwap";
  }

  let expressData: ExpressOrderMetricData | undefined;

  if (isExpress) {
    expressData = getExpressMetricData({ expressParams, asyncExpressParams, fastExpressParams });
  }

  const requestId = getRequestId();

  return cacheOrderMetricData<SwapMetricData>(getOrderPayloadsCreationKeys(orderPayloads), {
    metricId: `swap:${requestId}`,
    metricType,
    initialCollateralTokenAddress: fromToken?.address,
    initialCollateralAllowance: initialCollateralAllowance?.toString(),
    initialCollateralBalance: fromToken?.balance?.toString(),
    hasReferralCode,
    initialCollateralSymbol: fromToken?.symbol,
    toTokenAddress: toToken?.address,
    toTokenSymbol: toToken?.symbol,
    initialCollateralDeltaAmount: formatAmountForMetrics(swapAmounts?.amountIn, fromToken?.decimals),
    minOutputAmount: formatAmountForMetrics(swapAmounts?.minOutputAmount, toToken?.decimals),
    amountUsd: formatAmountForMetrics(swapAmounts?.usdOut),
    swapPath: swapAmounts?.swapStrategy.swapPathStats?.swapPath,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    allowedSlippage,
    orderType,
    isTwap,
    isExpress: isExpress ?? false,
    isExpress1CT: Boolean(subaccount),
    requestId,
    isFirstOrder,
    duration,
    executionFeeBufferBps,
    partsCount,
    tradeMode,
    expressData,
    chainId,
    isCollateralFromMultichain,
  });
}

export function initIncreaseOrderMetricData({
  fromToken,
  increaseAmounts,
  initialCollateralAllowance,
  hasExistingPosition,
  leverage,
  executionFee,
  orderType,
  hasReferralCode,
  subaccount,
  triggerPrice,
  marketInfo,
  isLong,
  isFirstOrder,
  isLeverageEnabled,
  isTPSLCreated,
  slCount,
  tpCount,
  priceImpactDeltaUsd,
  orderPayloads,
  priceImpactPercentage,
  executionFeeBufferBps,
  netRate1h,
  interactionId,
  isExpress,
  isTwap,
  duration,
  partsCount,
  tradeMode,
  expressParams,
  asyncExpressParams,
  fastExpressParams,
  chainId,
  isCollateralFromMultichain,
}: {
  fromToken: TokenData | undefined;
  increaseAmounts: IncreasePositionAmounts | undefined;
  orderPayloads: CreateOrderPayload[] | undefined;
  initialCollateralAllowance: bigint | undefined;
  leverage: string | undefined;
  executionFee: ExecutionFee | undefined;
  orderType: OrderType;
  allowedSlippage: number | undefined;
  hasReferralCode: boolean;
  hasExistingPosition: boolean | undefined;
  triggerPrice: bigint | undefined;
  marketInfo: MarketInfo | undefined;
  subaccount: Subaccount | undefined;
  isLong: boolean | undefined;
  isFirstOrder: boolean | undefined;
  isLeverageEnabled: boolean | undefined;
  isTPSLCreated: boolean | undefined;
  slCount: number | undefined;
  tpCount: number | undefined;
  priceImpactDeltaUsd: bigint | undefined;
  priceImpactPercentage: bigint | undefined;
  netRate1h: bigint | undefined;
  isExpress: boolean;
  isTwap: boolean;
  interactionId: string | undefined;
  duration: TwapDuration | undefined;
  executionFeeBufferBps: number | undefined;
  partsCount: number | undefined;
  tradeMode: TradeMode | undefined;
  expressParams: ExpressTxnParams | undefined;
  asyncExpressParams: ExpressTxnParams | undefined;
  fastExpressParams: ExpressTxnParams | undefined;
  chainId: number;
  isCollateralFromMultichain: boolean;
}) {
  let metricType: IncreaseOrderMetricData["metricType"] = "increasePosition";
  if (orderType === OrderType.LimitIncrease) {
    metricType = "limitOrder";
  }

  const requestId = getRequestId();

  return cacheOrderMetricData<IncreaseOrderMetricData>(getOrderPayloadsCreationKeys(orderPayloads), {
    metricId: `position:${requestId}`,
    requestId,
    isExpress,
    isTwap,
    isExpress1CT: Boolean(subaccount),
    isTPSLCreated,
    slCount,
    tpCount,
    metricType,
    hasReferralCode,
    hasExistingPosition,
    marketAddress: marketInfo?.marketTokenAddress,
    marketName: marketInfo?.name,
    marketIndexName: marketInfo ? getMarketIndexName(marketInfo) : undefined,
    marketPoolName: marketInfo ? getMarketPoolName(marketInfo) : undefined,
    leverage,
    initialCollateralTokenAddress: fromToken?.address,
    initialCollateralAllowance: initialCollateralAllowance?.toString(),
    initialCollateralBalance: fromToken?.balance?.toString(),
    initialCollateralSymbol: fromToken?.symbol,
    initialCollateralDeltaAmount: formatAmountForMetrics(increaseAmounts?.initialCollateralAmount, fromToken?.decimals),
    swapPath: increaseAmounts?.swapStrategy.swapPathStats?.swapPath || [],
    sizeDeltaUsd: formatAmountForMetrics(increaseAmounts?.sizeDeltaUsd),
    sizeDeltaInTokens: formatAmountForMetrics(increaseAmounts?.sizeDeltaInTokens, marketInfo?.indexToken.decimals),
    triggerPrice: formatAmountForMetrics(triggerPrice, USD_DECIMALS, false),
    acceptablePrice: formatAmountForMetrics(increaseAmounts?.acceptablePrice, USD_DECIMALS, false),
    isLong,
    orderType,
    executionFeeBufferBps,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    isFirstOrder,
    isLeverageEnabled,
    priceImpactDeltaUsd:
      priceImpactDeltaUsd !== undefined ? bigintToNumber(roundToOrder(priceImpactDeltaUsd, 2), USD_DECIMALS) : 0,
    priceImpactPercentage: formatPercentageForMetrics(priceImpactPercentage) ?? 0,
    netRate1h: parseFloat(formatRatePercentage(netRate1h)),
    internalSwapTotalFeesBps:
      increaseAmounts?.swapStrategy.swapPathStats && increaseAmounts.initialCollateralAmount > 0
        ? Number(
            getBasisPoints(
              increaseAmounts.swapStrategy.swapPathStats.totalFeesDeltaUsd,
              increaseAmounts.initialCollateralUsd
            )
          )
        : undefined,
    internalSwapTotalFeesDeltaUsd: formatAmountForMetrics(
      increaseAmounts?.swapStrategy.swapPathStats?.totalFeesDeltaUsd
    ),
    externalSwapUsdIn: formatAmountForMetrics(increaseAmounts?.swapStrategy.externalSwapQuote?.usdIn),
    externalSwapUsdOut: formatAmountForMetrics(increaseAmounts?.swapStrategy.externalSwapQuote?.usdOut),
    externalSwapFeesUsd: formatAmountForMetrics(increaseAmounts?.swapStrategy.externalSwapQuote?.feesUsd),
    externalSwapInTokenAddress: increaseAmounts?.swapStrategy.externalSwapQuote?.inTokenAddress,
    externalSwapOutTokenAddress: increaseAmounts?.swapStrategy.externalSwapQuote?.outTokenAddress,
    interactionId,
    duration,
    partsCount,
    tradeMode,
    expressData: getExpressMetricData({ expressParams, asyncExpressParams, fastExpressParams }),
    chainId,
    isCollateralFromMultichain,
  });
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
  priceImpactDeltaUsd,
  priceImpactPercentage,
  netRate1h,
  interactionId,
  isTwap,
  isExpress,
  duration,
  partsCount,
  executionFeeBufferBps,
  tradeMode,
  expressParams,
  asyncExpressParams,
  fastExpressParams,
  chainId,
  isCollateralFromMultichain,
  orderPayloads,
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
  priceImpactDeltaUsd: bigint | undefined;
  priceImpactPercentage: bigint | undefined;
  netRate1h: bigint | undefined;
  interactionId: string | undefined;
  executionFeeBufferBps: number | undefined;
  isExpress: boolean;
  isTwap: boolean;
  duration: TwapDuration | undefined;
  partsCount: number | undefined;
  tradeMode: TradeMode | undefined;
  expressParams: ExpressTxnParams | undefined;
  asyncExpressParams: ExpressTxnParams | undefined;
  fastExpressParams: ExpressTxnParams | undefined;
  chainId: number;
  isCollateralFromMultichain: boolean;
  orderPayloads: CreateOrderPayload[] | undefined;
}) {
  let metricType: DecreaseOrderMetricData["metricType"] = "decreasePosition";
  if (orderType === OrderType.LimitDecrease) {
    metricType = "takeProfitOrder";
  } else if (orderType === OrderType.StopLossDecrease) {
    metricType = "stopLossOrder";
  }

  const requestId = getRequestId();

  return cacheOrderMetricData<DecreaseOrderMetricData>(getOrderPayloadsCreationKeys(orderPayloads), {
    metricId: `position:${requestId}`,
    metricType,
    place,
    isStandalone: true,
    isFullClose: decreaseAmounts?.isFullClose,
    hasReferralCode,
    hasExistingPosition,
    marketAddress: marketInfo?.marketTokenAddress,
    marketName: marketInfo?.name,
    marketIndexName: marketInfo ? getMarketIndexName(marketInfo) : undefined,
    marketPoolName: marketInfo ? getMarketPoolName(marketInfo) : undefined,
    initialCollateralTokenAddress: collateralToken?.address,
    initialCollateralSymbol: collateralToken?.symbol,
    initialCollateralDeltaAmount: formatAmountForMetrics(
      decreaseAmounts?.collateralDeltaAmount,
      collateralToken?.decimals
    ),
    swapPath: [],
    sizeDeltaUsd: formatAmountForMetrics(decreaseAmounts?.sizeDeltaUsd),
    sizeDeltaInTokens: formatAmountForMetrics(decreaseAmounts?.sizeDeltaInTokens, marketInfo?.indexToken.decimals),
    triggerPrice: formatAmountForMetrics(triggerPrice, USD_DECIMALS, false),
    acceptablePrice: formatAmountForMetrics(decreaseAmounts?.acceptablePrice, USD_DECIMALS, false),
    isLong,
    orderType,
    executionFeeBufferBps,
    decreaseSwapType: decreaseAmounts?.decreaseSwapType,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    isExpress,
    isExpress1CT: Boolean(subaccount),
    isTwap,
    requestId,
    priceImpactDeltaUsd:
      priceImpactDeltaUsd !== undefined ? bigintToNumber(roundToOrder(priceImpactDeltaUsd, 2), USD_DECIMALS) : 0,
    priceImpactPercentage: formatPercentageForMetrics(priceImpactPercentage) ?? 0,
    netRate1h: parseFloat(formatRatePercentage(netRate1h)),
    interactionId,
    duration,
    partsCount,
    tradeMode,
    expressData: getExpressMetricData({ expressParams, asyncExpressParams, fastExpressParams }),
    chainId,
    isCollateralFromMultichain,
  });
}

export function initEditCollateralMetricData({
  orderType,
  marketInfo,
  collateralToken,
  collateralDeltaAmount,
  swapPath,
  selectedCollateralAddress,
  isLong,
  isExpress,
  executionFee,
  subaccount,
  expressParams,
  asyncExpressParams,
  fastExpressParams,
  chainId,
  isCollateralFromMultichain,
  orderPayloads,
}: {
  collateralToken: TokenData | undefined;
  executionFee: ExecutionFee | undefined;
  selectedCollateralAddress: string | undefined;
  collateralDeltaAmount: bigint | undefined;
  swapPath: string[] | undefined;
  orderType: OrderType | undefined;
  marketInfo: MarketInfo | undefined;
  subaccount: Subaccount | undefined;
  isExpress: boolean;
  isLong: boolean | undefined;
  expressParams: ExpressTxnParams | undefined;
  asyncExpressParams: ExpressTxnParams | undefined;
  fastExpressParams: ExpressTxnParams | undefined;
  chainId: number;
  isCollateralFromMultichain: boolean;
  orderPayloads: CreateOrderPayload[] | undefined;
}) {
  const requestId = getRequestId();

  return cacheOrderMetricData<EditCollateralMetricData>(getOrderPayloadsCreationKeys(orderPayloads), {
    metricId: `position:${requestId}`,
    metricType: orderType === OrderType.MarketIncrease ? "depositCollateral" : "withdrawCollateral",
    marketAddress: marketInfo?.marketTokenAddress,
    isStandalone: true,
    marketName: marketInfo?.name,
    initialCollateralTokenAddress: selectedCollateralAddress,
    initialCollateralSymbol: collateralToken?.symbol,
    initialCollateralDeltaAmount: formatAmountForMetrics(collateralDeltaAmount, collateralToken?.decimals),
    swapPath: swapPath ?? [],
    isLong,
    orderType,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    isExpress,
    isExpress1CT: Boolean(subaccount),
    requestId,
    expressData: getExpressMetricData({ expressParams, asyncExpressParams, fastExpressParams }),
    chainId,
    isCollateralFromMultichain,
  });
}

export function initGMSwapMetricData({
  longTokenAddress,
  shortTokenAddress,
  isDeposit,
  executionFeeTokenAmount,
  executionFeeTokenDecimals,
  marketInfo,
  marketToken,
  longTokenAmount,
  shortTokenAmount,
  marketTokenAmount,
  marketTokenUsd,
  isFirstBuy,
  chainId,
  srcChainId,
  isExpress,
  isExpress1CT,
  isCollateralFromMultichain,
  rawParams,
}: {
  longTokenAddress: string | undefined;
  shortTokenAddress: string | undefined;
  marketToken: TokenData | undefined;
  isDeposit: boolean;
  executionFeeTokenAmount: bigint | undefined;
  executionFeeTokenDecimals: number | undefined;
  marketInfo: MarketInfo | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  marketTokenAmount: bigint | undefined;
  marketTokenUsd: bigint | undefined;
  isFirstBuy: boolean | undefined;
  chainId: number;
  srcChainId: number | undefined;
  isExpress: boolean;
  isExpress1CT: boolean;
  isCollateralFromMultichain: boolean;
  rawParams: LpCreationParams | undefined;
}) {
  const requestId = getRequestId();

  return cacheOrderMetricData<SwapGmMetricData>(getLpCreationKeys(rawParams), {
    metricId: `gm:${requestId}`,
    metricType: isDeposit ? "buyGM" : "sellGM",
    requestId,
    chainId: srcChainId ?? chainId,
    isExpress,
    isExpress1CT,
    isCollateralFromMultichain,
    initialLongTokenAddress: longTokenAddress,
    initialShortTokenAddress: shortTokenAddress,
    marketAddress: marketInfo?.marketTokenAddress,
    marketName: marketInfo?.name,
    executionFee: formatAmountForMetrics(executionFeeTokenAmount, executionFeeTokenDecimals),
    longTokenAmount: formatAmountForMetrics(
      longTokenAmount,
      longTokenAddress ? getToken(chainId, longTokenAddress)?.decimals : undefined
    ),
    shortTokenAmount: formatAmountForMetrics(
      shortTokenAmount,
      shortTokenAddress ? getToken(chainId, shortTokenAddress)?.decimals : undefined
    ),
    marketTokenAmount: formatAmountForMetrics(marketTokenAmount, marketToken?.decimals),
    marketTokenUsd: formatAmountForMetrics(marketTokenUsd),
    isFirstBuy,
  });
}

export function initGLVSwapMetricData({
  chainId,
  srcChainId,
  isExpress,
  isExpress1CT,
  isCollateralFromMultichain,
  longTokenAddress,
  shortTokenAddress,
  isDeposit,
  executionFeeTokenAmount,
  executionFeeTokenDecimals,
  marketName,
  glvAddress,
  selectedMarketForGlv,
  glvTokenAmount,
  glvToken,
  longTokenAmount,
  shortTokenAmount,
  glvTokenUsd,
  isFirstBuy,
  rawParams,
}: {
  chainId: number;
  srcChainId: number | undefined;
  isExpress: boolean;
  isExpress1CT: boolean;
  isCollateralFromMultichain: boolean;
  longTokenAddress: string | undefined;
  shortTokenAddress: string | undefined;
  selectedMarketForGlv: string | undefined;
  isDeposit: boolean;
  executionFeeTokenAmount: bigint | undefined;
  executionFeeTokenDecimals: number | undefined;
  marketName: string | undefined;
  glvAddress: string | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  marketTokenAmount: bigint | undefined;
  glvTokenAmount: bigint | undefined;
  glvTokenUsd: bigint | undefined;
  glvToken: TokenData | undefined;
  isFirstBuy: boolean | undefined;
  rawParams: LpCreationParams | undefined;
}) {
  const requestId = getRequestId();

  return cacheOrderMetricData<SwapGLVMetricData>(getLpCreationKeys(rawParams), {
    metricId: `glv:${requestId}`,
    metricType: isDeposit ? "buyGLV" : "sellGLV",
    requestId,
    chainId: srcChainId ?? chainId,
    isExpress,
    isExpress1CT,
    isCollateralFromMultichain,
    initialLongTokenAddress: longTokenAddress,
    initialShortTokenAddress: shortTokenAddress,
    glvAddress,
    selectedMarketForGlv,
    marketName,
    executionFee: formatAmountForMetrics(executionFeeTokenAmount, executionFeeTokenDecimals),
    longTokenAmount: formatAmountForMetrics(
      longTokenAmount,
      longTokenAddress ? getToken(chainId, longTokenAddress)?.decimals : undefined
    ),
    shortTokenAmount: formatAmountForMetrics(
      shortTokenAmount,
      shortTokenAddress ? getToken(chainId, shortTokenAddress)?.decimals : undefined
    ),
    glvTokenAmount: formatAmountForMetrics(glvTokenAmount, glvToken?.decimals),
    glvTokenUsd: formatAmountForMetrics(glvTokenUsd),
    isFirstBuy,
  });
}

function getExpressMetricData({
  expressParams,
  asyncExpressParams,
  fastExpressParams,
}: {
  expressParams: ExpressTxnParams | undefined;
  asyncExpressParams: ExpressTxnParams | undefined;
  fastExpressParams: ExpressTxnParams | undefined;
}): ExpressOrderMetricData | undefined {
  if (!expressParams) {
    return undefined;
  }

  const expressData: ExpressOrderMetricData = {
    relayProvider: "gmx",
    isExpressValid: expressParams.gasPaymentValidations.isValid,
    isOutGasTokenBalance: expressParams.gasPaymentValidations.isOutGasTokenBalance,
    needGasTokenApproval: expressParams.gasPaymentValidations.needGasPaymentTokenApproval,
    isSubaccountValid: expressParams.subaccountValidations?.isValid,
    isSubbaccountExpired: expressParams.subaccountValidations?.isExpired,
    isSubaccountActionsExceeded: expressParams.subaccountValidations?.isActionsExceeded,
    isSubaccountNonceExpired: expressParams.subaccountValidations?.isNonceExpired,
    approximateGasLimit: fastExpressParams ? Number(fastExpressParams.gasLimit) : 0,
    approximateL1GasLimit: fastExpressParams ? Number(fastExpressParams.l1GasLimit) : 0,
    gasPrice: fastExpressParams ? Number(fastExpressParams.gasPrice) : 0,
    currentGasLimit: Number(expressParams.gasLimit),
    asyncGasLimit: asyncExpressParams ? Number(asyncExpressParams.gasLimit) : 0,
    currentEstimationMethod: expressParams.estimationMethod,
    gasPaymentToken: expressParams.gasPaymentParams?.gasPaymentToken.symbol,
  };

  return expressData;
}
export function initShiftGmMetricData({
  chainId,
  isExpress,
  isExpress1CT,
  isCollateralFromMultichain,
  executionFee,
  fromMarketToken,
  fromMarketTokenAmount,
  toMarketToken,
  minMarketTokenAmount,
}: {
  chainId: number;
  isExpress: boolean;
  isExpress1CT: boolean;
  isCollateralFromMultichain: boolean;
  executionFee: ExecutionFee | undefined;
  fromMarketToken: TokenData | undefined;
  fromMarketTokenAmount: bigint | undefined;
  toMarketToken: TokenData | undefined;
  minMarketTokenAmount: bigint | undefined;
}) {
  const requestId = getRequestId();
  const creationKeys =
    fromMarketToken && toMarketToken && fromMarketTokenAmount !== undefined
      ? [
          getShiftCreationKey({
            fromMarket: fromMarketToken.address,
            toMarket: toMarketToken.address,
            marketTokenAmount: fromMarketTokenAmount,
          }),
        ]
      : [];

  return cacheOrderMetricData<ShiftGmMetricData>(creationKeys, {
    metricId: `shift:${requestId}`,
    metricType: "shiftGM",
    requestId,
    chainId,
    isExpress,
    isExpress1CT,
    isCollateralFromMultichain,
    fromMarketAddress: fromMarketToken?.address,
    toMarketAddress: toMarketToken?.address,
    minToMarketTokenAmount: formatAmountForMetrics(minMarketTokenAmount, toMarketToken?.decimals),
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
  });
}

export function initMultichainDepositMetricData({
  sourceChain,
  settlementChain,
  assetSymbol,
  sizeInUsd,
  isFirstDeposit,
}: {
  sourceChain: number;
  settlementChain: number;
  assetSymbol: string;
  sizeInUsd: bigint;
  isFirstDeposit: boolean;
}) {
  return metrics.setCachedMetricData<MultichainDepositMetricData>({
    metricId: getMultichainDepositMetricId({
      sourceChain,
      settlementChain,
      assetSymbol,
    }),
    metricType: "multichainDeposit",
    sourceChain,
    settlementChain,
    assetSymbol,
    sizeInUsd: formatAmountForMetrics(sizeInUsd)!,
    isFirstDeposit,
  });
}

export function initMultichainWithdrawalMetricData({
  sourceChain,
  settlementChain,
  assetSymbol,
  isFirstWithdrawal,
  sizeInUsd,
}: {
  sourceChain: number;
  settlementChain: number;
  assetSymbol: string;
  isFirstWithdrawal: boolean;
  sizeInUsd: bigint;
}) {
  return metrics.setCachedMetricData<MultichainWithdrawalMetricData>({
    metricId: getMultichainWithdrawalMetricId({
      sourceChain,
      settlementChain,
      assetSymbol,
    }),
    metricType: "multichainWithdrawal",
    sourceChain,
    settlementChain,
    assetSymbol,
    sizeInUsd: formatAmountForMetrics(sizeInUsd)!,
    isFirstWithdrawal,
  });
}

type LpCreationParams =
  | RawCreateDepositParams
  | RawCreateGlvDepositParams
  | RawCreateWithdrawalParams
  | RawCreateGlvWithdrawalParams;

function cacheOrderMetricData<TData extends OrderMetricData = never>(creationKeys: string[], metricData: TData) {
  const cached = metrics.setCachedMetricData<TData>(metricData);

  pruneOrderTracking(new Set(metrics.getCachedMetricIds()));
  expectOrderCreations(cached.metricId, creationKeys);

  return cached;
}

function joinCreationKey(kind: string, parts: (string | bigint | number | boolean | string[])[]) {
  return [kind, ...parts.map((part) => (Array.isArray(part) ? part.join("-") : String(part)))].join(":");
}

export function getOrderCreationKey(
  p: Pick<
    OrderCreatedEventData,
    | "orderType"
    | "marketAddress"
    | "initialCollateralTokenAddress"
    | "swapPath"
    | "isLong"
    | "sizeDeltaUsd"
    | "initialCollateralDeltaAmount"
    | "contractTriggerPrice"
    | "contractAcceptablePrice"
    | "minOutputAmount"
    | "decreasePositionSwapType"
  >
) {
  return joinCreationKey("order", [
    p.orderType,
    p.marketAddress,
    p.initialCollateralTokenAddress,
    p.swapPath,
    p.isLong,
    p.sizeDeltaUsd,
    isDecreaseOrderType(p.orderType) ? p.initialCollateralDeltaAmount : "",
    p.contractTriggerPrice,
    p.contractAcceptablePrice,
    p.minOutputAmount,
    p.decreasePositionSwapType,
  ]);
}

function getOrderPayloadsCreationKeys(orderPayloads: CreateOrderPayload[] | undefined) {
  return (orderPayloads ?? []).map((payload) =>
    getOrderCreationKey({
      orderType: payload.orderType,
      marketAddress: payload.addresses.market,
      initialCollateralTokenAddress: payload.addresses.initialCollateralToken,
      swapPath: payload.addresses.swapPath,
      isLong: payload.isLong,
      sizeDeltaUsd: payload.numbers.sizeDeltaUsd,
      initialCollateralDeltaAmount: payload.numbers.initialCollateralDeltaAmount,
      contractTriggerPrice: payload.numbers.triggerPrice,
      contractAcceptablePrice: payload.numbers.acceptablePrice,
      minOutputAmount: payload.numbers.minOutputAmount,
      decreasePositionSwapType: payload.decreasePositionSwapType,
    })
  );
}

export function getDepositCreationKey(
  p: Pick<
    DepositCreatedEventData,
    | "marketAddress"
    | "initialLongTokenAddress"
    | "initialShortTokenAddress"
    | "longTokenSwapPath"
    | "shortTokenSwapPath"
    | "minMarketTokens"
  >
) {
  return joinCreationKey("deposit", [
    p.marketAddress,
    p.initialLongTokenAddress,
    p.initialShortTokenAddress,
    p.longTokenSwapPath,
    p.shortTokenSwapPath,
    p.minMarketTokens,
  ]);
}

export function getGlvDepositCreationKey(
  p: Pick<
    GLVDepositCreatedEventData,
    | "glvAddress"
    | "marketAddress"
    | "initialLongTokenAddress"
    | "initialShortTokenAddress"
    | "longTokenSwapPath"
    | "shortTokenSwapPath"
    | "minMarketTokens"
  >
) {
  return joinCreationKey("glvDeposit", [
    p.glvAddress,
    p.marketAddress,
    p.initialLongTokenAddress,
    p.initialShortTokenAddress,
    p.longTokenSwapPath,
    p.shortTokenSwapPath,
    p.minMarketTokens,
  ]);
}

export function getWithdrawalCreationKey(
  p: Pick<WithdrawalCreatedEventData, "marketAddress" | "minLongTokenAmount" | "minShortTokenAmount">
) {
  return joinCreationKey("withdrawal", [p.marketAddress, p.minLongTokenAmount, p.minShortTokenAmount]);
}

export function getShiftCreationKey(p: Pick<ShiftCreatedEventData, "fromMarket" | "toMarket" | "marketTokenAmount">) {
  return joinCreationKey("shift", [p.fromMarket, p.toMarket, p.marketTokenAmount]);
}

function getLpCreationKeys(p: LpCreationParams | undefined): string[] {
  if (!p) {
    return [];
  }

  if ("minGlvTokens" in p) {
    return [
      getGlvDepositCreationKey({
        glvAddress: p.addresses.glv,
        marketAddress: p.addresses.market,
        initialLongTokenAddress: p.addresses.initialLongToken,
        initialShortTokenAddress: p.addresses.initialShortToken,
        longTokenSwapPath: p.addresses.longTokenSwapPath,
        shortTokenSwapPath: p.addresses.shortTokenSwapPath,
        minMarketTokens: p.minGlvTokens,
      }),
    ];
  }

  if ("minMarketTokens" in p) {
    return [
      getDepositCreationKey({
        marketAddress: p.addresses.market,
        initialLongTokenAddress: p.addresses.initialLongToken,
        initialShortTokenAddress: p.addresses.initialShortToken,
        longTokenSwapPath: p.addresses.longTokenSwapPath,
        shortTokenSwapPath: p.addresses.shortTokenSwapPath,
        minMarketTokens: p.minMarketTokens,
      }),
    ];
  }

  return [
    getWithdrawalCreationKey({
      marketAddress: "glv" in p.addresses ? p.addresses.glv : p.addresses.market,
      minLongTokenAmount: p.minLongTokenAmount,
      minShortTokenAmount: p.minShortTokenAmount,
    }),
  ];
}

export function getMultichainDepositMetricId(p: {
  sourceChain: number;
  settlementChain: number;
  assetSymbol: string;
}): MultichainDepositMetricData["metricId"] {
  return `multichainDeposit:${[p.sourceChain, p.settlementChain, p.assetSymbol].join(":")}`;
}

export function getMultichainWithdrawalMetricId(p: {
  sourceChain: number;
  settlementChain: number;
  assetSymbol: string;
}): MultichainWithdrawalMetricData["metricId"] {
  return `multichainWithdrawal:${[p.sourceChain, p.settlementChain, p.assetSymbol].join(":")}`;
}

export function sendOrderSubmittedMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendOrderSubmittedMetric");
    return;
  }

  getOrderStepTimings(metricId, OrderStage.Submitted);

  metrics.pushEvent<SubmittedOrderEvent>({
    event: `${metricData?.metricType}.submitted`,
    isError: false,
    data: metricData,
  });
}

export function sendOrderSimulatedMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendOrderSimulatedMetric");
    return;
  }

  const timings = getOrderStepTimings(metricId, OrderStage.Simulated);

  metrics.pushEvent<OrderSimulatedEvent>({
    event: `${metricData.metricType}.simulated`,
    isError: false,
    time: timings.timeFromSubmitted,
    data: { ...metricData, ...timings },
  });
}

export function sendOrderTxnSubmittedMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendOrderTxnSubmittedMetric");
    return;
  }

  markOrderCreationsSent(metricId);

  const timings = getOrderStepTimings(metricId, OrderStage.TxnSubmitted);

  metrics.pushEvent<OrderTxnSubmittedEvent>({
    event: `${metricData.metricType}.txnSubmitted`,
    isError: false,
    time: timings.timeFromSimulated,
    data: { ...metricData, ...timings },
  });
}

export function makeTxnSentMetricsHandler(metricId: OrderMetricId) {
  return () => {
    sendTxnSentMetric(metricId);
  };
}

export function sendTxnSentMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendTxnSentMetric");
    return;
  }

  markOrderCreationsSent(metricId);

  const timings = getOrderStepTimings(metricId, OrderStage.Sent);

  metrics.pushEvent<OrderSentEvent>({
    event: `${metricData.metricType}.sent`,
    isError: false,
    time: timings.timeFromTxnSubmitted,
    data: { ...metricData, ...timings },
  });

  return Promise.resolve();
}

export function sendTxnValidationErrorMetric(metricId: OrderMetricId) {
  markOrderCreationsFailed(metricId);

  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendTxnValidationErrorMetric");
    return;
  }

  metrics.pushEvent({
    event: `${metricData.metricType}.failed`,
    isError: true,
    data: {
      errorContext: "submit",
      errorMessage: "Error submitting order, missed data",
      ...metricData,
    },
  });
}

export function sendTxnErrorMetric(
  metricId: OrderMetricId | undefined,
  error: ErrorLike | undefined,
  errorContext: OrderErrorContext
) {
  if (metricId) {
    markOrderCreationsFailed(metricId);
  }

  const metricData = metricId ? metrics.getCachedMetricData<OrderMetricData>(metricId) : undefined;

  if (!metricData) {
    const err = extendError(new Error("Order metric data not found"), {
      data: {
        originalError: parseError(error),
      },
    });
    metrics.pushError(err, "sendTxnErrorMetric");
    return;
  }

  const errorData = parseError(error);
  const timings = metricId ? getOrderStepTimings(metricId, OrderStage.Failed) : undefined;

  const eventName =
    `${metricData.metricType}.${errorData?.isUserRejectedError ? OrderStage.Rejected : OrderStage.Failed}` as const;

  metrics.pushEvent<OrderTxnFailedEvent>({
    event: eventName,
    isError: true,
    data: {
      ...(metricData || {}),
      ...(errorData || {}),
      ...(timings || {}),
      errorContext,
    },
  });
}

export function makeTxnErrorMetricsHandler(metricId: OrderMetricId) {
  return (error: ErrorLike) => {
    sendTxnErrorMetric(metricId, error, "sending");
    throw error;
  };
}

export function sendOrderCreatedMetric(metricId: OrderMetricId, hasMoreCreations = false) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendOrderCreatedMetric");
    return;
  }

  const timings = getOrderStepTimings(metricId, OrderStage.Created, { keepTimers: hasMoreCreations });

  metrics.pushEvent<OrderCreatedEvent>({
    event: `${metricData.metricType}.created`,
    isError: false,
    time: timings.timeFromSubmitted,
    data: { ...metricData, ...timings },
  });
}

export function sendOrderExecutedMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendOrderExecutedMetric");
    return;
  }

  const timings = getOrderStepTimings(metricId, OrderStage.Executed);

  metrics.pushEvent<OrderExecutedEvent>({
    event: `${metricData.metricType}.executed`,
    isError: false,
    time: timings.timeFromSent,
    data: { ...metricData, ...timings },
  });
}

export function sendOrderCancelledMetric(metricId: OrderMetricId, eventData: EventLogData) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendOrderCancelledMetric");
    return;
  }

  metrics.pushEvent<OrderCancelledEvent>({
    event: `${metricData.metricType}.failed`,
    isError: true,
    time: metrics.getTime(metricId, true),
    data: {
      ...(metricData || {}),
      errorMessage: `${metricData.metricType} cancelled`,
      reason: eventData.stringItems.items.reason,
      errorContext: "execution",
    },
  });
}

export function sendTrackedOrderCreatedMetric(creationKey: string, orderKey: string) {
  const trackedOrder = trackCreatedOrder(creationKey, orderKey);

  if (trackedOrder) {
    sendOrderCreatedMetric(trackedOrder.metricId, trackedOrder.hasMoreCreations);
  }

  return trackedOrder?.metricId;
}

export function sendTrackedOrderExecutedMetric(orderKey: string) {
  const metricId = takeCreatedOrderMetricId(orderKey);

  if (metricId) {
    sendOrderExecutedMetric(metricId);
  }

  return metricId;
}

export function sendTrackedOrderCancelledMetric(orderKey: string, eventData: EventLogData) {
  const metricId = takeCreatedOrderMetricId(orderKey);

  if (metricId) {
    sendOrderCancelledMetric(metricId, eventData);
  }

  return metricId;
}

export function formatAmountForMetrics(
  amount?: bigint,
  decimals = USD_DECIMALS,
  round: "toOrder" | "toSecondOrderInt" | false = "toOrder"
): number | undefined {
  if (amount === undefined) {
    return undefined;
  }

  if (round === "toOrder") {
    return bigintToNumber(roundToOrder(amount), decimals);
  } else if (round === "toSecondOrderInt") {
    return Math.round(bigintToNumber(roundToOrder(amount, 2), decimals));
  }

  return bigintToNumber(amount, decimals);
}

export function formatPercentageForMetrics(percentage?: bigint, roundToDecimals = 2) {
  if (percentage === undefined) {
    return undefined;
  }

  const rounded = roundToOrder(percentage, roundToDecimals);
  const formatted = formatPercentage(rounded, { bps: false, displayDecimals: roundToDecimals });

  if (!formatted) {
    return undefined;
  }

  return parseFloat(formatted);
}

function getOrderStepTimings(metricId: OrderMetricId, step: OrderStage, { keepTimers = false } = {}) {
  const timingIds = {
    [OrderStage.Submitted]: metricId,
    [OrderStage.Simulated]: `${metricId}.simulated`,
    [OrderStage.TxnSubmitted]: `${metricId}.txnSubmitted`,
    [OrderStage.Sent]: `${metricId}.sent`,
    [OrderStage.Created]: `${metricId}.created`,
  };

  const clear = !keepTimers && (step === OrderStage.Created || step === OrderStage.Failed);

  const currentTimings: OrderStepTimings = {
    timeFromSubmitted: metrics.getTime(timingIds[OrderStage.Submitted], clear) ?? 0,
    timeFromSimulated: metrics.getTime(timingIds[OrderStage.Simulated], clear) ?? 0,
    timeFromTxnSubmitted: metrics.getTime(timingIds[OrderStage.TxnSubmitted], clear) ?? 0,
    timeFromSent: metrics.getTime(timingIds[OrderStage.Sent], clear) ?? 0,
    timeFromCreated: metrics.getTime(timingIds[OrderStage.Created], clear) ?? 0,
  };

  // @ts-expect-error not all OrderStage values are keys of timingIds, handled by the if check below
  const timerToStart = timingIds[step];

  if (timerToStart) {
    metrics.startTimer(timerToStart);
  }

  return currentTimings;
}

export function getRequestId() {
  return `${Date.now()}_${Math.round(Math.random() * 10000000)}`;
}
