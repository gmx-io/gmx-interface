import { extendError } from "lib/errors";

import type {
  GelatoTaskStatus,
  PendingDepositData,
  PendingOrderData,
  PendingShiftData,
  PendingWithdrawalData,
} from "./types";

export function getPendingOrderKey(
  data: Omit<PendingOrderData, "txnType" | "triggerPrice" | "acceptablePrice" | "autoCancel" | "createdAt">
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
    // For same-collateral markets, the contract's recordTransferIn lumps both
    // token transfers into initialLongTokenAmount (since it's the same token),
    // while the frontend splits them 50/50. Combine amounts to match the event.
    const isSameCollaterals = data.initialLongTokenAddress === data.initialShortTokenAddress;
    const longAmount = isSameCollaterals
      ? data.initialLongTokenAmount + data.initialShortTokenAmount
      : data.initialLongTokenAmount;
    const shortAmount = isSameCollaterals ? 0n : data.initialShortTokenAmount;

    return [
      data.account,
      data.glvAddress,
      data.initialLongTokenAddress,
      data.initialShortTokenAddress,
      data.longTokenSwapPath.join("-"),
      data.shortTokenSwapPath.join("-"),
      data.shouldUnwrapNativeToken,
      longAmount.toString(),
      shortAmount.toString(),
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

export function extractGelatoError(gelatoTaskStatus: GelatoTaskStatus) {
  if (gelatoTaskStatus.revertData) {
    return extendError(new Error(`data="${gelatoTaskStatus.revertData}"`), {
      data: { taskId: gelatoTaskStatus.taskId, message: gelatoTaskStatus.message },
    });
  }

  const bytecodeMatch = gelatoTaskStatus.message?.match(BYTECODE_REGEXP);

  if (bytecodeMatch) {
    const bytecode = bytecodeMatch[0];
    return extendError(new Error(`data="${bytecode}"`), {
      data: { taskId: gelatoTaskStatus.taskId, message: gelatoTaskStatus.message },
    });
  }

  return extendError(new Error(`Gelato task cancelled, unknown reason`), {
    data: { taskId: gelatoTaskStatus.taskId, message: gelatoTaskStatus.message },
  });
}

export function getGelatoTaskUrl({
  taskId,
  isDebug,
  tenderlyAccountSlug,
  tenderlyProjectSlug,
}: {
  taskId: string;
  isDebug: boolean;
  tenderlyAccountSlug?: string;
  tenderlyProjectSlug?: string;
}) {
  const tenderlySlugs =
    tenderlyAccountSlug && tenderlyProjectSlug
      ? `tenderlyUsername=${tenderlyAccountSlug}&tenderlyProjectName=${tenderlyProjectSlug}`
      : "";

  return `https://api.gelato.digital/tasks/status/${taskId}/${isDebug ? "debug" : ""}?${tenderlySlugs}`;
}
