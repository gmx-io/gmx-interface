import type { SWRConfiguration } from "swr";
import { defaultConfig } from "swr/_internal";
import { type Hex, decodeErrorResult, isHex } from "viem";

import { StargateErrorsAbi } from "config/multichain";
import { type ErrorLike } from "lib/errors";
import { extractErrorRevertData } from "lib/errors/customErrors";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

const STARGATE_ROUTE_UNAVAILABLE_ERROR_NAMES = ["FeeLib_Paused", "Stargate_Paused", "Messaging_Unavailable"];

export function tryDecodeStargateError(data: Hex) {
  try {
    return decodeErrorResult({ abi: StargateErrorsAbi, data });
  } catch {
    return undefined;
  }
}

export function getIsStargateRouteUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const data = extractErrorRevertData(error as ErrorLike);
  const errorName = isHex(data) ? tryDecodeStargateError(data)?.errorName : undefined;

  return errorName !== undefined && STARGATE_ROUTE_UNAVAILABLE_ERROR_NAMES.includes(errorName);
}

// A route Stargate switched off stays off for hours: recheck it once a minute instead of on swr's 5s to 20m backoff
export const retryStargateQuoteOnError: NonNullable<SWRConfiguration["onErrorRetry"]> = (
  error,
  key,
  config,
  revalidate,
  opts
) => {
  if (getIsStargateRouteUnavailableError(error)) {
    setTimeout(() => revalidate(opts), CONFIG_UPDATE_INTERVAL);
    return;
  }

  defaultConfig.onErrorRetry(error, key, config, revalidate, opts);
};
