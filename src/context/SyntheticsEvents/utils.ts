import { type Abi, encodeErrorResult } from "viem";

import { extendError } from "lib/errors";
import { abis } from "sdk/abis";

import type {
  RelayTaskStatus,
  OrderStatus,
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
    data.decreasePositionSwapType,
  ].join(":");
}

export function findMatchedOrderStatus(orderList: OrderStatus[], orderData: PendingOrderData) {
  if (orderData.orderKey) {
    return orderList.find((status) => status.key === orderData.orderKey);
  }

  const matchingOrderKey = getPendingOrderKey(orderData);

  return orderList.find((status) => {
    return (status.data && matchingOrderKey === getPendingOrderKey(status.data)) || status.key === matchingOrderKey;
  });
}

export function findOrderStatusForAllocation(orderList: OrderStatus[], orderData: PendingOrderData) {
  const candidates = orderData.orderKey
    ? orderList
    : orderList.filter((status) => !status.updatedTxnHash && !status.cancelledTxnHash);

  return findMatchedOrderStatus(candidates, orderData);
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
const DECODED_REVERT_REASON_REGEXP = /^(\w+)\((.*)\)$/;

const CUSTOM_ERRORS_ABI = abis.CustomErrors as Abi;

function parseReasonArg(rawArg: string, type: string): unknown {
  if (/^u?int\d*$/.test(type)) {
    return BigInt(rawArg);
  }

  if (type === "bool") {
    return rawArg === "true";
  }

  return rawArg;
}

/** GMX Relay reports failures as decoded `ErrorName(arg,arg)` strings, not revert bytes; a reason that does not round-trip the ABI stays undecoded. */
function encodeRelayReasonAsRevertData(reason: string | undefined): string | undefined {
  const match = reason?.match(DECODED_REVERT_REASON_REGEXP);

  if (!match) {
    return undefined;
  }

  const [, errorName, joinedArgs] = match;

  const abiError = CUSTOM_ERRORS_ABI.find((item) => item.type === "error" && item.name === errorName);

  if (abiError?.type !== "error") {
    return undefined;
  }

  const rawArgs = joinedArgs === "" ? [] : joinedArgs.split(",");

  if (rawArgs.length !== abiError.inputs.length) {
    return undefined;
  }

  try {
    return encodeErrorResult({
      abi: CUSTOM_ERRORS_ABI,
      errorName,
      args: rawArgs.map((rawArg, index) => parseReasonArg(rawArg, abiError.inputs[index].type)),
    });
  } catch {
    return undefined;
  }
}

export function extractRelayTaskError(relayTaskStatus: RelayTaskStatus) {
  const revertData = relayTaskStatus.revertData ?? encodeRelayReasonAsRevertData(relayTaskStatus.message);

  if (revertData) {
    return extendError(new Error(`data="${revertData}"`), {
      data: { taskId: relayTaskStatus.taskId, message: relayTaskStatus.message },
    });
  }

  const bytecodeMatch = relayTaskStatus.message?.match(BYTECODE_REGEXP);

  if (bytecodeMatch) {
    const bytecode = bytecodeMatch[0];
    return extendError(new Error(`data="${bytecode}"`), {
      data: { taskId: relayTaskStatus.taskId, message: relayTaskStatus.message },
    });
  }

  return extendError(new Error(`Relay task cancelled, unknown reason`), {
    data: { taskId: relayTaskStatus.taskId, message: relayTaskStatus.message },
  });
}

