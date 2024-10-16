import {
  METRIC_EVENT_DISPATCH_NAME,
  METRIC_COUNTER_DISPATCH_NAME,
  METRIC_TIMING_DISPATCH_NAME,
} from "lib/metrics/emitMetricEvent";

import { MAX_TIMEOUT, Multicall, MulticallProviderUrls } from "./Multicall";
import type { MulticallRequestConfig } from "./types";
import { isWebWorker } from "config/env";

async function executeMulticall(
  chainId: number,
  providerUrls: MulticallProviderUrls,
  request: MulticallRequestConfig<any>,
  abFlags: Record<string, boolean>,
  isLargeAccount: boolean
) {
  const multicall = await Multicall.getInstance(chainId, abFlags);

  return multicall?.call(providerUrls, request, MAX_TIMEOUT, isLargeAccount);
}

self.addEventListener("message", run);

async function run(event) {
  const { PRODUCTION_PREVIEW_KEY, chainId, providerUrls, request, id, abFlags, isLargeAccount } = event.data;
  // @ts-ignore
  self.PRODUCTION_PREVIEW_KEY = PRODUCTION_PREVIEW_KEY;

  try {
    const result = await executeMulticall(chainId, providerUrls, request, abFlags, isLargeAccount);

    postMessage({
      id,
      result,
    });
  } catch (error) {
    postMessage({
      id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  }
}

if (isWebWorker) {
  globalThis.addEventListener(METRIC_EVENT_DISPATCH_NAME, (event) => {
    postMessage({
      isMetrics: true,
      detail: (event as CustomEvent).detail,
    });
  });

  globalThis.addEventListener(METRIC_COUNTER_DISPATCH_NAME, (event) => {
    postMessage({
      isCounter: true,
      detail: (event as CustomEvent).detail,
    });
  });

  globalThis.addEventListener(METRIC_TIMING_DISPATCH_NAME, (event) => {
    postMessage({
      isTiming: true,
      detail: (event as CustomEvent).detail,
    });
  });
}
