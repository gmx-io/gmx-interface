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

export function getCallId(contractAddress: string, abiId: AbiId, methodName: string, params: any[]) {
  return JSON.stringify([contractAddress, abiId, methodName, params]);
}

export function getContractAbiKey(contractAddress: string, abiId: AbiId) {
  return `${contractAddress}-${abiId}`;
}

export function parseContractAbiKey(contractAbiKey: string) {
  const firstHyphenIndex = contractAbiKey.indexOf("-");
  const contractAddress = contractAbiKey.slice(0, firstHyphenIndex);
  const abiId = contractAbiKey.slice(firstHyphenIndex + 1);

  return { contractAddress, abiId };
}
