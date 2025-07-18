import { OrderMetricId, sendTxnErrorMetric } from "lib/metrics";

import type {
  GelatoTaskStatus,
  PendingDepositData,
  PendingOrderData,
  PendingShiftData,
  PendingWithdrawalData,
} from "./types";
import { extendError } from "lib/errors";

export function getPendingOrderKey(
  data: Omit<PendingOrderData, "txnType" | "triggerPrice" | "acceptablePrice" | "autoCancel">
) {
  return [
    data.account,
    data.marketAddress,
    data.initialCollateralTokenAddress,
    data.swapPath.join("-"),
    data.shouldUnwrapNativeToken,
    data.isLong,
    data.orderType,
  ].join(":");
}

export function getPendingDepositKey(data: PendingDepositData) {
  if (data.isGlvDeposit) {
    return [
      data.account,
      data.glvAddress,
      data.initialLongTokenAddress,
      data.initialShortTokenAddress,
      data.longTokenSwapPath.join("-"),
      data.shortTokenSwapPath.join("-"),
      data.shouldUnwrapNativeToken,
      data.initialLongTokenAmount.toString(),
      data.initialShortTokenAmount.toString(),
      (data.initialMarketTokenAmount ?? 0n).toString(),
    ].join(":");
  }

  if (data.initialShortTokenAddress === data.initialLongTokenAddress) {
    return [
      data.account,
      data.marketAddress,
      data.initialLongTokenAddress,
      data.longTokenSwapPath.join("-"),
      data.shouldUnwrapNativeToken,
      (data.initialLongTokenAmount + data.initialShortTokenAmount).toString(),
    ].join(":");
  }

  return [
    data.account,
    data.marketAddress,
    data.initialLongTokenAddress,
    data.initialShortTokenAddress,
    data.longTokenSwapPath.join("-"),
    data.shortTokenSwapPath.join("-"),
    data.shouldUnwrapNativeToken,
    data.initialLongTokenAmount.toString(),
    data.initialShortTokenAmount.toString(),
  ].join(":");
}

export function getPendingWithdrawalKey(data: PendingWithdrawalData) {
  return [
    data.account,
    data.marketAddress,
    data.minLongTokenAmount.toString(),
    data.marketTokenAmount.toString(),
    data.shouldUnwrapNativeToken,
  ].join(":");
}

export function getPendingShiftKey(data: PendingShiftData) {
  return [
    data.account,
    data.fromMarket,
    data.marketTokenAmount.toString(),
    data.toMarket,
    data.minMarketTokens.toString(),
  ].join(":");
}

const BYTECODE_REGEXP = /0x[a-fA-F0-9]+/;

export async function sendGelatoTaskStatusMetric(metricId: OrderMetricId, gelatoTaskStatus: GelatoTaskStatus) {
  const bytecodeMatch = gelatoTaskStatus.lastCheckMessage?.match(BYTECODE_REGEXP);

  if (bytecodeMatch) {
    const bytecode = bytecodeMatch[0];
    const error = extendError(new Error(`data="${bytecode}"`), {
      data: { taskId: gelatoTaskStatus.taskId },
    });
    sendTxnErrorMetric(metricId, error, "relayer");
    return;
  }

  sendTxnErrorMetric(
    metricId,
    new Error(`Gelato task cancelled, unknown reason ${gelatoTaskStatus.taskId}`),
    "relayer"
  );
}
