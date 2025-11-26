import { fallbackTrackerEventKeys } from "lib/FallbackTracker/events";
import {
  METRIC_EVENT_DISPATCH_NAME,
  METRIC_COUNTER_DISPATCH_NAME,
  METRIC_TIMING_DISPATCH_NAME,
} from "lib/metrics/emitMetricEvent";

import { MULTICALL_DEBUG_EVENT_NAME } from "./_debug";
import type { MulticallDebugState } from "./_debug";
import { Multicall, MulticallProviderUrls } from "./Multicall";
import type { MulticallRequestConfig } from "./types";

async function executeMulticall(
  chainId: number,
  providerUrls: MulticallProviderUrls,
  request: MulticallRequestConfig<any>,
  abFlags: Record<string, boolean>,
  isLargeAccount: boolean,
  debugState?: MulticallDebugState
) {
  const multicall = await Multicall.getInstance(chainId, abFlags);

  return multicall?.call(providerUrls, request, isLargeAccount, debugState);
}

self.addEventListener("message", run);

async function run(event) {
  const { PRODUCTION_PREVIEW_KEY, chainId, providerUrls, request, id, abFlags, isLargeAccount, debugState } =
    event.data;
  // @ts-ignore
  self.PRODUCTION_PREVIEW_KEY = PRODUCTION_PREVIEW_KEY;

  try {
    const result = await executeMulticall(chainId, providerUrls, request, abFlags, isLargeAccount, debugState);

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

// Register listeners for metric and debug events
// In worker context, these listeners forward events to main thread via postMessage
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

globalThis.addEventListener(MULTICALL_DEBUG_EVENT_NAME, (event) => {
  postMessage({
    isDebug: true,
    detail: (event as CustomEvent).detail,
  });
});

globalThis.addEventListener(fallbackTrackerEventKeys.reportFailure, (event) => {
  postMessage({
    isFallbackTrackerFailure: true,
    detail: (event as CustomEvent).detail,
  });
});
