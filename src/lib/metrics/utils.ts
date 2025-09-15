import { USD_DECIMALS } from "config/factors";
import { EventLogData } from "context/SyntheticsEvents";
import { ExpressTxnParams } from "domain/synthetics/express";
import { ExecutionFee } from "domain/synthetics/fees";
import { getMarketIndexName, getMarketPoolName, MarketInfo } from "domain/synthetics/markets";
import { OrderType } from "domain/synthetics/orders";
import { Subaccount } from "domain/synthetics/subaccount";
import { TokenData } from "domain/synthetics/tokens";
import { DecreasePositionAmounts, IncreasePositionAmounts, SwapAmounts, TradeMode } from "domain/synthetics/trade";
import { ErrorLike, extendError, OrderErrorContext, parseError } from "lib/errors";
import { bigintToNumber, formatPercentage, formatRatePercentage, getBasisPoints, roundToOrder } from "lib/numbers";
import { getToken } from "sdk/configs/tokens";
import { TwapDuration } from "sdk/types/twap";
import { CreateOrderPayload } from "sdk/utils/orderTransactions";

import { metrics, SubmittedOrderEvent } from ".";
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
  OrderMetricType,
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

  return metrics.setCachedMetricData<SwapMetricData>({
    metricId: getSwapOrderMetricId({
      initialCollateralTokenAddress: fromToken?.wrappedAddress || fromToken?.address,
      swapPath: swapAmounts?.swapStrategy.swapPathStats?.swapPath,
      orderType,
      initialCollateralDeltaAmount: swapAmounts?.amountIn,
      executionFee: executionFee?.feeTokenAmount,
    }),
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
    requestId: getRequestId(),
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
  orderPayload,
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
  orderPayload: CreateOrderPayload | undefined;
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

  return metrics.setCachedMetricData<IncreaseOrderMetricData>({
    metricId: getPositionOrderMetricId({
      marketAddress: marketInfo?.marketTokenAddress,
      initialCollateralTokenAddress: orderPayload?.addresses.initialCollateralToken,
      swapPath: orderPayload?.addresses.swapPath,
      isLong: orderPayload?.isLong,
      orderType,
      sizeDeltaUsd: increaseAmounts?.sizeDeltaUsd,
      initialCollateralDeltaAmount: increaseAmounts?.initialCollateralAmount,
    }),
    requestId: getRequestId(),
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
  swapPath,
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
}: {
  collateralToken: TokenData | undefined;
  decreaseAmounts: DecreasePositionAmounts | undefined;
  executionFee: ExecutionFee | undefined;
  orderType: OrderType | undefined;
  swapPath: string[] | undefined;
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
}) {
  let metricType: DecreaseOrderMetricData["metricType"] = "decreasePosition";
  if (orderType === OrderType.LimitDecrease) {
    metricType = "takeProfitOrder";
  } else if (orderType === OrderType.StopLossDecrease) {
    metricType = "stopLossOrder";
  }

  return metrics.setCachedMetricData<DecreaseOrderMetricData>({
    metricId: getPositionOrderMetricId({
      marketAddress: marketInfo?.marketTokenAddress,
      initialCollateralTokenAddress: collateralToken?.wrappedAddress || collateralToken?.address,
      swapPath,
      isLong,
      orderType,
      sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
      initialCollateralDeltaAmount: decreaseAmounts?.collateralDeltaAmount,
    }),
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
    requestId: getRequestId(),
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
}: {
  collateralToken: TokenData | undefined;
  executionFee: ExecutionFee | undefined;
  selectedCollateralAddress: string | undefined;
  collateralDeltaAmount: bigint | undefined;
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
}) {
  return metrics.setCachedMetricData<EditCollateralMetricData>({
    metricId: getPositionOrderMetricId({
      marketAddress: marketInfo?.marketTokenAddress,
      initialCollateralTokenAddress: collateralToken?.wrappedAddress || collateralToken?.address,
      swapPath: [],
      isLong,
      orderType,
      sizeDeltaUsd: 0n,
      initialCollateralDeltaAmount: collateralDeltaAmount,
    }),
    metricType: orderType === OrderType.MarketIncrease ? "depositCollateral" : "withdrawCollateral",
    marketAddress: marketInfo?.marketTokenAddress,
    isStandalone: true,
    marketName: marketInfo?.name,
    initialCollateralTokenAddress: selectedCollateralAddress,
    initialCollateralSymbol: collateralToken?.symbol,
    initialCollateralDeltaAmount: formatAmountForMetrics(collateralDeltaAmount, collateralToken?.decimals),
    swapPath: [],
    isLong,
    orderType,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    isExpress,
    isExpress1CT: Boolean(subaccount),
    requestId: getRequestId(),
    expressData: getExpressMetricData({ expressParams, asyncExpressParams, fastExpressParams }),
    chainId,
    isCollateralFromMultichain,
  });
}

export function initGMSwapMetricData({
  longTokenAddress,
  shortTokenAddress,
  isDeposit,
  executionFee,
  marketInfo,
  marketToken,
  longTokenAmount,
  shortTokenAmount,
  marketTokenAmount,
  marketTokenUsd,
  isFirstBuy,
  chainId,
}: {
  longTokenAddress: string | undefined;
  shortTokenAddress: string | undefined;
  marketToken: TokenData | undefined;
  isDeposit: boolean;
  executionFee: ExecutionFee | undefined;
  marketInfo: MarketInfo | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  marketTokenAmount: bigint | undefined;
  marketTokenUsd: bigint | undefined;
  isFirstBuy: boolean | undefined;
  chainId: number;
}) {
  return metrics.setCachedMetricData<SwapGmMetricData>({
    metricId: getGMSwapMetricId({
      marketAddress: marketInfo?.marketTokenAddress,
      executionFee: executionFee?.feeTokenAmount,
    }),
    metricType: isDeposit ? "buyGM" : "sellGM",
    requestId: getRequestId(),
    initialLongTokenAddress: longTokenAddress,
    initialShortTokenAddress: shortTokenAddress,
    marketAddress: marketInfo?.marketTokenAddress,
    marketName: marketInfo?.name,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
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
  longTokenAddress,
  shortTokenAddress,
  isDeposit,
  executionFee,
  marketName,
  glvAddress,
  selectedMarketForGlv,
  glvTokenAmount,
  glvToken,
  longTokenAmount,
  shortTokenAmount,
  glvTokenUsd,
  isFirstBuy,
}: {
  chainId: number;
  longTokenAddress: string | undefined;
  shortTokenAddress: string | undefined;
  selectedMarketForGlv: string | undefined;
  isDeposit: boolean;
  executionFee: ExecutionFee | undefined;
  marketName: string | undefined;
  glvAddress: string | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  marketTokenAmount: bigint | undefined;
  glvTokenAmount: bigint | undefined;
  glvTokenUsd: bigint | undefined;
  glvToken: TokenData | undefined;
  isFirstBuy: boolean | undefined;
}) {
  return metrics.setCachedMetricData<SwapGLVMetricData>({
    metricId: getGLVSwapMetricId({
      glvAddress,
      executionFee: executionFee?.feeTokenAmount,
    }),
    metricType: isDeposit ? "buyGLV" : "sellGLV",
    requestId: getRequestId(),
    initialLongTokenAddress: longTokenAddress,
    initialShortTokenAddress: shortTokenAddress,
    glvAddress,
    selectedMarketForGlv,
    marketName,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
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
    isExpressValid: expressParams.gasPaymentValidations.isValid,
    isOutGasTokenBalance: expressParams.gasPaymentValidations.isOutGasTokenBalance,
    needGasTokenApproval: expressParams.gasPaymentValidations.needGasPaymentTokenApproval,
    isSubaccountValid: expressParams.subaccountValidations?.isValid,
    isSubbaccountExpired: expressParams.subaccountValidations?.isExpired,
    isSubaccountActionsExceeded: expressParams.subaccountValidations?.isActionsExceeded,
    isSubaccountNonceExpired: expressParams.subaccountValidations?.isNonceExpired,
    isSponsoredCall: Boolean(expressParams?.isSponsoredCall),
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
  executionFee,
  fromMarketToken,
  toMarketToken,
  minMarketTokenAmount,
}: {
  executionFee: ExecutionFee | undefined;
  fromMarketToken: TokenData | undefined;
  toMarketToken: TokenData | undefined;
  minMarketTokenAmount: bigint | undefined;
}) {
  return metrics.setCachedMetricData<ShiftGmMetricData>({
    metricId: getShiftGMMetricId({
      fromMarketAddress: fromMarketToken?.address,
      toMarketAddress: toMarketToken?.address,
      executionFee: executionFee?.feeTokenAmount,
    }),
    metricType: "shiftGM",
    requestId: getRequestId(),
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

export function getGMSwapMetricId(p: {
  marketAddress: string | undefined;
  executionFee: bigint | undefined;
}): SwapGmMetricData["metricId"] {
  return `gm:${[p.marketAddress || "marketTokenAddress", p.executionFee?.toString || "marketTokenAmount"].join(":")}`;
}

export function getGLVSwapMetricId(p: {
  glvAddress: string | undefined;
  executionFee: bigint | undefined;
}): SwapGLVMetricData["metricId"] {
  return `glv:${[p.glvAddress || "glvAddress", p.executionFee?.toString() || "executionFee"].join(":")}`;
}

export function getShiftGMMetricId(p: {
  fromMarketAddress: string | undefined;
  toMarketAddress: string | undefined;
  executionFee: bigint | undefined;
}): ShiftGmMetricData["metricId"] {
  return `shift:${[p.fromMarketAddress || "fromMarketAddress", p.toMarketAddress || "toMarketAddress", p.executionFee?.toString() || "marketTokenAmount"].join(":")}`;
}

export function getSwapOrderMetricId(p: {
  initialCollateralTokenAddress: string | undefined;
  swapPath: string[] | undefined;
  orderType: OrderType | undefined;
  initialCollateralDeltaAmount: bigint | undefined;
  executionFee: bigint | undefined;
}): SwapMetricData["metricId"] {
  return `swap:${[
    p.initialCollateralTokenAddress || "initialColltateralTokenAddress",
    p.swapPath?.join("-") || "swapPath",
    p.orderType || "orderType",
  ].join(":")}`;
}

export function getPositionOrderMetricId(p: {
  marketAddress: string | undefined;
  initialCollateralTokenAddress: string | undefined;
  swapPath: string[] | undefined;
  isLong: boolean | undefined;
  orderType: OrderType | undefined;
  sizeDeltaUsd: bigint | undefined;
  initialCollateralDeltaAmount: bigint | undefined;
}): IncreaseOrderMetricData["metricId"] {
  return `position:${[
    p.marketAddress || "marketAddress",
    p.initialCollateralTokenAddress || "initialCollateralTokenAddress",
    p.swapPath?.join("-") || "swapPath",
    p.isLong || "isLong",
    p.orderType || "orderType",
  ].join(":")}`;
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

  metrics.pushEvent<OrderTxnFailedEvent>({
    event: `${metricData.metricType}.${errorData?.isUserRejectedError ? OrderStage.Rejected : OrderStage.Failed}`,
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

export function sendOrderCreatedMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendOrderCreatedMetric");
    return;
  }

  const timings = getOrderStepTimings(metricId, OrderStage.Created);

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

function getOrderStepTimings(metricId: OrderMetricId, step: OrderStage) {
  const timingIds = {
    [OrderStage.Submitted]: metricId,
    [OrderStage.Simulated]: `${metricId}.simulated`,
    [OrderStage.TxnSubmitted]: `${metricId}.txnSubmitted`,
    [OrderStage.Sent]: `${metricId}.sent`,
    [OrderStage.Created]: `${metricId}.created`,
  };

  const clear = step === OrderStage.Created || step === OrderStage.Failed;

  const currentTimings: OrderStepTimings = {
    timeFromSubmitted: metrics.getTime(timingIds[OrderStage.Submitted], clear) ?? 0,
    timeFromSimulated: metrics.getTime(timingIds[OrderStage.Simulated], clear) ?? 0,
    timeFromTxnSubmitted: metrics.getTime(timingIds[OrderStage.TxnSubmitted], clear) ?? 0,
    timeFromSent: metrics.getTime(timingIds[OrderStage.Sent], clear) ?? 0,
    timeFromCreated: metrics.getTime(timingIds[OrderStage.Created], clear) ?? 0,
  };

  const timerToStart = timingIds[step];

  if (timerToStart) {
    metrics.startTimer(timerToStart);
  }

  return currentTimings;
}

export function getRequestId() {
  return `${Date.now()}_${Math.round(Math.random() * 10000000)}`;
}
