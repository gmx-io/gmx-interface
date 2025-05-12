import { ErrorLike } from "ab/testMultichain/parseError";
import { USD_DECIMALS } from "config/factors";
import { EventLogData } from "context/SyntheticsEvents";
import { ExecutionFee } from "domain/synthetics/fees";
import { getMarketIndexName, getMarketPoolName, MarketInfo } from "domain/synthetics/markets";
import { OrderType } from "domain/synthetics/orders";
import { Subaccount } from "domain/synthetics/subaccount";
import { TokenData } from "domain/synthetics/tokens";
import { DecreasePositionAmounts, IncreasePositionAmounts, SwapAmounts } from "domain/synthetics/trade";
import { OrderErrorContext, parseError } from "lib/errors";
import { bigintToNumber, formatPercentage, formatRatePercentage, getBasisPoints, roundToOrder } from "lib/numbers";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { metrics, SubmittedOrderEvent } from ".";
import {
  DecreaseOrderMetricData,
  EditCollateralMetricData,
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
  isExpress: boolean | undefined;
  isFirstOrder: boolean | undefined;
}) {
  return metrics.setCachedMetricData<SwapMetricData>({
    metricId: getSwapOrderMetricId({
      initialCollateralTokenAddress: fromToken?.wrappedAddress || fromToken?.address,
      swapPath: swapAmounts?.swapPathStats?.swapPath,
      orderType,
      initialCollateralDeltaAmount: swapAmounts?.amountIn,
      executionFee: executionFee?.feeTokenAmount,
    }),
    metricType: orderType === OrderType.LimitSwap ? "limitSwap" : "swap",
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
    swapPath: swapAmounts?.swapPathStats?.swapPath,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    allowedSlippage,
    orderType,
    isExpress: isExpress ?? false,
    isExpress1CT: Boolean(subaccount && fromToken?.address !== NATIVE_TOKEN_ADDRESS),
    requestId: getRequestId(),
    isFirstOrder,
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
  priceImpactPercentage,
  netRate1h,
  interactionId,
  isExpress,
}: {
  chainId: number;
  fromToken: TokenData | undefined;
  increaseAmounts: IncreasePositionAmounts | undefined;
  collateralToken: TokenData | undefined;
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
  interactionId: string | undefined;
}) {
  return metrics.setCachedMetricData<IncreaseOrderMetricData>({
    metricId: getPositionOrderMetricId({
      marketAddress: marketInfo?.marketTokenAddress,
      initialCollateralTokenAddress: fromToken?.address,
      swapPath: increaseAmounts?.swapPathStats?.swapPath || [],
      isLong,
      orderType,
      sizeDeltaUsd: increaseAmounts?.sizeDeltaUsd,
      initialCollateralDeltaAmount: increaseAmounts?.initialCollateralAmount,
    }),
    requestId: getRequestId(),
    isExpress,
    isExpress1CT: Boolean(subaccount && fromToken?.address !== NATIVE_TOKEN_ADDRESS),
    isTPSLCreated,
    slCount,
    tpCount,
    metricType: orderType === OrderType.LimitIncrease ? "limitOrder" : "increasePosition",
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
    swapPath: increaseAmounts?.swapPathStats?.swapPath || [],
    sizeDeltaUsd: formatAmountForMetrics(increaseAmounts?.sizeDeltaUsd),
    sizeDeltaInTokens: formatAmountForMetrics(increaseAmounts?.sizeDeltaInTokens, marketInfo?.indexToken.decimals),
    triggerPrice: formatAmountForMetrics(triggerPrice, USD_DECIMALS, false),
    acceptablePrice: formatAmountForMetrics(increaseAmounts?.acceptablePrice, USD_DECIMALS, false),
    isLong,
    orderType,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    isFirstOrder,
    isLeverageEnabled,
    priceImpactDeltaUsd:
      priceImpactDeltaUsd !== undefined ? bigintToNumber(roundToOrder(priceImpactDeltaUsd, 2), USD_DECIMALS) : 0,
    priceImpactPercentage: formatPercentageForMetrics(priceImpactPercentage) ?? 0,
    netRate1h: parseFloat(formatRatePercentage(netRate1h)),
    internalSwapTotalFeesBps:
      increaseAmounts?.swapPathStats && increaseAmounts.initialCollateralAmount > 0
        ? Number(getBasisPoints(increaseAmounts.swapPathStats.totalFeesDeltaUsd, increaseAmounts.initialCollateralUsd))
        : undefined,
    internalSwapTotalFeesDeltaUsd: formatAmountForMetrics(increaseAmounts?.swapPathStats?.totalFeesDeltaUsd),
    externalSwapUsdIn: formatAmountForMetrics(increaseAmounts?.externalSwapQuote?.usdIn),
    externalSwapUsdOut: formatAmountForMetrics(increaseAmounts?.externalSwapQuote?.usdOut),
    externalSwapFeesUsd: formatAmountForMetrics(increaseAmounts?.externalSwapQuote?.feesUsd),
    externalSwapInTokenAddress: increaseAmounts?.externalSwapQuote?.inTokenAddress,
    externalSwapOutTokenAddress: increaseAmounts?.externalSwapQuote?.outTokenAddress,
    interactionId,
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
  isExpress,
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
  isExpress: boolean;
}) {
  let metricType;
  if (orderType === OrderType.LimitDecrease) {
    metricType = "takeProfitOrder";
  } else if (orderType === OrderType.StopLossDecrease) {
    metricType = "stopLossOrder";
  } else {
    metricType = "decreasePosition";
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
    decreaseSwapType: decreaseAmounts?.decreaseSwapType,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    isExpress,
    isExpress1CT: Boolean(subaccount),
    requestId: getRequestId(),
    priceImpactDeltaUsd:
      priceImpactDeltaUsd !== undefined ? bigintToNumber(roundToOrder(priceImpactDeltaUsd, 2), USD_DECIMALS) : 0,
    priceImpactPercentage: formatPercentageForMetrics(priceImpactPercentage) ?? 0,
    netRate1h: parseFloat(formatRatePercentage(netRate1h)),
    interactionId,
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
    isExpress1CT: Boolean(subaccount && selectedCollateralAddress !== NATIVE_TOKEN_ADDRESS),
    requestId: getRequestId(),
  });
}

export function initGMSwapMetricData({
  longToken,
  shortToken,
  isDeposit,
  executionFee,
  marketInfo,
  marketToken,
  longTokenAmount,
  shortTokenAmount,
  marketTokenAmount,
  marketTokenUsd,
  isFirstBuy,
}: {
  longToken: TokenData | undefined;
  shortToken: TokenData | undefined;
  marketToken: TokenData | undefined;
  isDeposit: boolean;
  executionFee: ExecutionFee | undefined;
  marketInfo: MarketInfo | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  marketTokenAmount: bigint | undefined;
  marketTokenUsd: bigint | undefined;
  isFirstBuy: boolean | undefined;
}) {
  return metrics.setCachedMetricData<SwapGmMetricData>({
    metricId: getGMSwapMetricId({
      marketAddress: marketInfo?.marketTokenAddress,
      executionFee: executionFee?.feeTokenAmount,
    }),
    metricType: isDeposit ? "buyGM" : "sellGM",
    requestId: getRequestId(),
    initialLongTokenAddress: longToken?.address,
    initialShortTokenAddress: shortToken?.address,
    marketAddress: marketInfo?.marketTokenAddress,
    marketName: marketInfo?.name,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    longTokenAmount: formatAmountForMetrics(longTokenAmount, longToken?.decimals),
    shortTokenAmount: formatAmountForMetrics(shortTokenAmount, shortToken?.decimals),
    marketTokenAmount: formatAmountForMetrics(marketTokenAmount, marketToken?.decimals),
    marketTokenUsd: formatAmountForMetrics(marketTokenUsd),
    isFirstBuy,
  });
}

export function initGLVSwapMetricData({
  longToken,
  shortToken,
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
  longToken: TokenData | undefined;
  shortToken: TokenData | undefined;
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
    initialLongTokenAddress: longToken?.address,
    initialShortTokenAddress: shortToken?.address,
    glvAddress,
    selectedMarketForGlv,
    marketName,
    executionFee: formatAmountForMetrics(executionFee?.feeTokenAmount, executionFee?.feeToken.decimals),
    longTokenAmount: formatAmountForMetrics(longTokenAmount, longToken?.decimals),
    shortTokenAmount: formatAmountForMetrics(shortTokenAmount, shortToken?.decimals),
    glvTokenAmount: formatAmountForMetrics(glvTokenAmount, glvToken?.decimals),
    glvTokenUsd: formatAmountForMetrics(glvTokenUsd),
    isFirstBuy,
  });
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
  assetAddress,
  sizeInUsd,
  isFirstDeposit,
}: {
  sourceChain: number;
  settlementChain: number;
  assetSymbol: string;
  assetAddress: string;
  sizeInUsd: bigint;
  isFirstDeposit: boolean;
}) {
  return metrics.setCachedMetricData<MultichainDepositMetricData>({
    metricId: getMultichainDepositMetricId({
      sourceChain,
      settlementChain,
      assetSymbol,
      assetAddress,
      sizeInUsd,
      isFirstDeposit,
    }),
    metricType: "multichainDeposit",
    sourceChain,
    settlementChain,
    assetSymbol,
    assetAddress,
    sizeInUsd: formatAmountForMetrics(sizeInUsd)!,
    isFirstDeposit,
  });
}

export function initMultichainWithdrawalMetricData({
  sourceChain,
  settlementChain,
  assetSymbol,
  assetAddress,
  sizeInUsd,
  isFirstWithdrawal,
}: {
  sourceChain: number;
  settlementChain: number;
  assetSymbol: string;
  assetAddress: string;
  sizeInUsd: bigint;
  isFirstWithdrawal: boolean;
}) {
  return metrics.setCachedMetricData<MultichainWithdrawalMetricData>({
    metricId: getMultichainWithdrawalMetricId({
      sourceChain,
      settlementChain,
      assetSymbol,
      assetAddress,
      sizeInUsd,
      isFirstWithdrawal,
    }),
    metricType: "multichainWithdrawal",
    sourceChain,
    settlementChain,
    assetSymbol,
    assetAddress,
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
    p.initialCollateralDeltaAmount?.toString() || "initialCollateralDeltaAmount",
    p.executionFee?.toString() || "executionFee",
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
    p.sizeDeltaUsd?.toString() || "sizeDeltaUsd",
  ].join(":")}`;
}

export function getMultichainDepositMetricId(p: {
  sourceChain: number;
  settlementChain: number;
  assetSymbol: string;
  assetAddress: string;
  sizeInUsd: bigint;
  isFirstDeposit: boolean;
}): MultichainDepositMetricData["metricId"] {
  return `multichainDeposit:${[
    p.sourceChain,
    p.settlementChain,
    p.assetSymbol,
    p.assetAddress,
    formatAmountForMetrics(p.sizeInUsd),
    p.isFirstDeposit,
  ].join(":")}`;
}

export function getMultichainWithdrawalMetricId(p: {
  sourceChain: number;
  settlementChain: number;
  assetSymbol: string;
  assetAddress: string;
  sizeInUsd: bigint;
  isFirstWithdrawal: boolean;
}): MultichainWithdrawalMetricData["metricId"] {
  return `multichainWithdrawal:${[
    p.sourceChain,
    p.settlementChain,
    p.assetSymbol,
    p.assetAddress,
    formatAmountForMetrics(p.sizeInUsd),
    p.isFirstWithdrawal,
  ].join(":")}`;
}

export function sendOrderSubmittedMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendOrderSubmittedMetric");
    return;
  }

  metrics.pushEvent<SubmittedOrderEvent>({
    event: `${metricData?.metricType}.submitted`,
    isError: false,
    data: metricData,
  });

  metrics.startTimer(metricId);
}

export function sendOrderSimulatedMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendOrderSimulatedMetric");
    return;
  }

  metrics.pushEvent<OrderSimulatedEvent>({
    event: `${metricData.metricType}.simulated`,
    isError: false,
    time: metrics.getTime(metricId)!,
    data: metricData,
  });
}

export function sendOrderTxnSubmittedMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendOrderTxnSubmittedMetric");
    return;
  }

  metrics.pushEvent<OrderTxnSubmittedEvent>({
    event: `${metricData.metricType}.txnSubmitted`,
    isError: false,
    time: metrics.getTime(metricId)!,
    data: metricData,
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

  metrics.pushEvent<OrderSentEvent>({
    event: `${metricData.metricType}.sent`,
    isError: false,
    time: metrics.getTime(metricId)!,
    data: metricData,
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
  metricId: OrderMetricId,
  error: ErrorLike | undefined,
  errorContext: OrderErrorContext
) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendTxnErrorMetric");
    return;
  }

  const errorData = parseError(error);

  metrics.pushEvent<OrderTxnFailedEvent>({
    event: `${metricData.metricType}.${errorData?.isUserRejectedError ? OrderStage.Rejected : OrderStage.Failed}`,
    isError: true,
    data: {
      errorContext,
      ...(errorData || {}),
      ...metricData,
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

  metrics.pushEvent<OrderCreatedEvent>({
    event: `${metricData.metricType}.created`,
    isError: false,
    time: metrics.getTime(metricId),
    data: metricData,
  });
}

export function sendOrderExecutedMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendOrderExecutedMetric");
    return;
  }

  metrics.pushEvent<OrderExecutedEvent>({
    event: `${metricData.metricType}.executed`,
    isError: false,
    time: metrics.getTime(metricId, true),
    data: metricData,
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

export function getRequestId() {
  return `${Date.now()}_${Math.round(Math.random() * 10000000)}`;
}
