import { BaseError, CallExecutionError, ContractFunctionRevertedError, ContractFunctionZeroDataError } from "viem";

import type { AbiId } from "sdk/abis";

import type { MulticallErrors } from "./types";

export function serializeMulticallErrors(errors: MulticallErrors<any>) {
  let errorString = "";
  let lastError = "";

  for (const [contractKey, contractErrors] of Object.entries(errors)) {
    let isContractKeyPresented = false;

    for (const [callName, callError] of Object.entries(contractErrors)) {
      const errorMessage = callError.shortMessage || callError.message.slice(0, 50);

      // Log unique errors
      if (!lastError || lastError !== errorMessage) {
        const contractKeyStr = isContractKeyPresented ? "" : `${contractKey}: `;
        isContractKeyPresented = true;
        errorString += `${contractKeyStr}${callName}: ${errorMessage}; `;
      }

      lastError = errorMessage;
    }
  }

  return errorString;
}

// viem labels a whole failed chunk as reverted when the RPC answers -32603 or code 3, so a read only counts
// as reverted when its error came from decoding aggregate3 results, not from the RPC call itself.
export function isContractRevert(error: unknown) {
  return (
    error instanceof BaseError &&
    !error.walk((cause) => cause instanceof CallExecutionError) &&
    Boolean(
      error.walk(
        (cause) => cause instanceof ContractFunctionRevertedError || cause instanceof ContractFunctionZeroDataError
      )
    )
  );
}

export function getCallId(contractAddress: string, abiId: AbiId, methodName: string, params: any[]) {
  return JSON.stringify([contractAddress, abiId, methodName, params]);
}

export function getContractAbiKey(contractAddress: string, abiId: AbiId) {
  return `${contractAddress}-${abiId}`;
}

const CALLS_COUNT_BUCKETS: [maxCallsCount: number, bucket: string][] = [
  [1, "1"],
  [10, "2-10"],
  [50, "11-50"],
  [100, "51-100"],
  [200, "101-200"],
  [500, "201-500"],
  [1000, "501-1000"],
  [2000, "1001-2000"],
  [5000, "2001-5000"],
];

export function getCallsCountBucket(callsCount: number): string {
  return CALLS_COUNT_BUCKETS.find(([maxCallsCount]) => callsCount <= maxCallsCount)?.[1] ?? ">5000";
}
