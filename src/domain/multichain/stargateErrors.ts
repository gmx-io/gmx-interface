import type { SWRConfiguration } from "swr";
import { defaultConfig } from "swr/_internal";
import { decodeErrorResult, isHex } from "viem";

import { StargateErrorsAbi } from "config/multichain";
import { type ErrorLike } from "lib/errors";
import { extractErrorRevertData } from "lib/errors/customErrors";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

const STARGATE_ROUTE_UNAVAILABLE_ERROR_NAMES = ["FeeLib_Paused", "Stargate_Paused", "Messaging_Unavailable"];
const STARGATE_SLOW_RETRY_ERROR_NAMES = [...STARGATE_ROUTE_UNAVAILABLE_ERROR_NAMES, "Path_InsufficientCredit"];

export function decodeStargateError(error: unknown) {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const data = extractErrorRevertData(error as ErrorLike);

  if (!isHex(data)) {
    return undefined;
  }

  try {
    const decoded = decodeErrorResult({ abi: StargateErrorsAbi, data });

    // viem also matches the generic Error(string) and Panic(uint256); those aren't Stargate's errors
    return StargateErrorsAbi.includes(decoded.abiItem) ? decoded : undefined;
  } catch {
    return undefined;
  }
}

function getIsStargateErrorIn(error: unknown, errorNames: string[]): boolean {
  const errorName = decodeStargateError(error)?.errorName;

  return errorName !== undefined && errorNames.includes(errorName);
}

export function getIsStargateRouteUnavailableError(error: unknown): boolean {
  return getIsStargateErrorIn(error, STARGATE_ROUTE_UNAVAILABLE_ERROR_NAMES);
}

const slowRetryTimers = new Map<string, ReturnType<typeof setTimeout>>();

// A paused or empty route stays so for hours: recheck it once a minute instead of on swr's 5s to 20m backoff.
// Every failed focus revalidation calls this too, so keep one timer per key or the chains pile up.
export const retryStargateQuoteOnError: NonNullable<SWRConfiguration["onErrorRetry"]> = (
  error,
  key,
  config,
  revalidate,
  opts
) => {
  if (getIsStargateErrorIn(error, STARGATE_SLOW_RETRY_ERROR_NAMES)) {
    clearTimeout(slowRetryTimers.get(key));
    slowRetryTimers.set(
      key,
      setTimeout(() => {
        slowRetryTimers.delete(key);
        // Restart the backoff so a later network error retries in seconds, not at the count these retries built up
        revalidate({ ...opts, retryCount: 0 });
      }, CONFIG_UPDATE_INTERVAL)
    );
    return;
  }

  defaultConfig.onErrorRetry(error, key, config, revalidate, opts);
};
