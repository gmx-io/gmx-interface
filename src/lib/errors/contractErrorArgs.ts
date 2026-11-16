import type { ErrorData } from "sdk/utils/errors";
import { getByKey } from "sdk/utils/objects";

export function getContractErrorArg(contractErrorArgs: ErrorData["contractErrorArgs"], index: number, key?: string) {
  if (!contractErrorArgs) {
    return undefined;
  }

  if (Array.isArray(contractErrorArgs)) {
    return contractErrorArgs[index];
  }

  if (typeof contractErrorArgs === "object") {
    const argsByKey = contractErrorArgs as Record<string, unknown>;

    if (key && key in argsByKey) {
      return getByKey(argsByKey, key);
    }

    return Object.values(argsByKey)[index];
  }

  return undefined;
}

export function getBigIntContractErrorArg(
  contractErrorArgs: ErrorData["contractErrorArgs"],
  index: number,
  key?: string
) {
  const value = getContractErrorArg(contractErrorArgs, index, key);
  return typeof value === "bigint" ? value : undefined;
}

export function getStringContractErrorArg(
  contractErrorArgs: ErrorData["contractErrorArgs"],
  index: number,
  key?: string
) {
  const value = getContractErrorArg(contractErrorArgs, index, key);
  return typeof value === "string" ? value : undefined;
}
