import { EventLogData, PendingDepositData, PendingOrderData, PendingWithdrawalData } from "./types";

export function parseEventLogData(eventData): EventLogData {
  const ret: any = {};
  for (const typeKey of [
    "addressItems",
    "uintItems",
    "intItems",
    "boolItems",
    "bytes32Items",
    "bytesItems",
    "stringItems",
  ]) {
    ret[typeKey] = {};

    for (const listKey of ["items", "arrayItems"]) {
      ret[typeKey][listKey] = {};

      for (const item of eventData[typeKey][listKey]) {
        ret[typeKey][listKey][item.key] = item.value;
      }
    }
  }

  return ret as EventLogData;
}

export function getPendingOrderKey(data: PendingOrderData) {
  return [
    data.account,
    data.marketAddress,
    data.initialCollateralTokenAddress,
    data.swapPath.join("-"),
    data.shouldUnwrapNativeToken,
    data.isLong,
    data.orderType,
    data.sizeDeltaUsd.toString(),
    data.initialCollateralDeltaAmount.toString(),
  ].join(":");
}

export function getPendingDepositKey(data: PendingDepositData) {
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
