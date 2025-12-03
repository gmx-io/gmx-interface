import "core-js/stable/promise/with-resolvers";

import uniqueId from "lodash/uniqueId";

import { getAbFlags } from "config/ab";
import { PRODUCTION_PREVIEW_KEY } from "config/localStorage";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { emitReportEndpointFailure } from "lib/FallbackTracker/events";
import { MetricEventParams, MulticallTimeoutEvent } from "lib/metrics";
import { emitMetricCounter, emitMetricEvent, emitMetricTiming } from "lib/metrics/emitMetricEvent";
import { CurrentRpcEndpoints } from "lib/rpc/RpcTracker";
import { getCurrentRpcUrls } from "lib/rpc/useRpcUrls";
import { sleep } from "lib/sleep";

import { _debugMulticall, MULTICALL_DEBUG_EVENT_NAME, type MulticallDebugEvent } from "./_debug";
import { executeMulticallMainThread } from "./executeMulticallMainThread";
import { MAX_FALLBACK_TIMEOUT } from "./Multicall";
import { MAX_PRIMARY_TIMEOUT } from "./Multicall";
import type { MulticallRequestConfig, MulticallResult } from "./types";

let executorWorker: Worker | null = null;
if (typeof window !== "undefined" && !import.meta.env?.TEST) {
  try {
    executorWorker = new Worker(new URL("./multicall.worker", import.meta.url), { type: "module" });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[executeMulticallWorker] Failed to create worker:", error);
  }
}

if (executorWorker) {
  executorWorker.onerror = (error) => {
    // eslint-disable-next-line no-console
    console.error("[executeMulticallWorker] Worker error:", error);
  };
}

const promises: Record<string, { resolve: (value: any) => void; reject: (error: any) => void }> = {};

if (executorWorker) {
  executorWorker.onmessage = (event) => {
    if ("isMetrics" in event.data) {
      emitMetricEvent<MetricEventParams>(event.data.detail);
      return;
    }

    if ("isCounter" in event.data) {
      emitMetricCounter<any>({
        event: event.data.detail.event,
        data: event.data.detail.data,
      });
      return;
    }

    if ("isTiming" in event.data) {
      emitMetricTiming<any>({
        event: event.data.detail.event,
        time: event.data.detail.time,
        data: event.data.detail.data,
      });
      return;
    }

    if ("isFallbackTrackerFailure" in event.data) {
      emitReportEndpointFailure(event.data.detail);
      return;
    }

    if ("isDebug" in event.data) {
      const debugEvent = event.data.detail as MulticallDebugEvent;
      globalThis.dispatchEvent(new CustomEvent(MULTICALL_DEBUG_EVENT_NAME, { detail: debugEvent }));
      return;
    }

    const { id, result, error } = event.data;

    const promise = promises[id];

    if (!promise) {
      // eslint-disable-next-line no-console
      console.warn(`[executeMulticallWorker] Received message with unknown id: ${id}`);

      return;
    }

    if (error) {
      const errorObj = new Error(error.message);

      errorObj.stack = error.stack;
      errorObj.name = error.name;

      promise.reject(errorObj);
    } else {
      promise.resolve(result);
    }

    delete promises[id];
  };
}

/**
 * Executes a multicall request in a worker.
 * If the worker does not respond in time, it falls back to the main thread.
 */
export async function executeMulticallWorker(
  chainId: number,
  request: MulticallRequestConfig<any>
): Promise<MulticallResult<any> | undefined> {
  // If worker is not available, fallback to main thread
  if (!executorWorker) {
    return await executeMulticallMainThread(chainId, request);
  }

  const id = uniqueId("multicall-");

  const currentRpcEndpoints = getCurrentRpcUrls(chainId) as CurrentRpcEndpoints;
  const debugState = _debugMulticall?.getDebugState();

  executorWorker.postMessage({
    id,
    chainId,
    providerUrls: currentRpcEndpoints,
    request,
    abFlags: getAbFlags(),
    isLargeAccount: getIsLargeAccount(),
    PRODUCTION_PREVIEW_KEY: localStorage.getItem(PRODUCTION_PREVIEW_KEY),
    debugState,
  });

  const { promise, resolve, reject } = Promise.withResolvers<MulticallResult<any> | undefined>();
  promises[id] = { resolve, reject };

  const escapePromise = sleep(MAX_PRIMARY_TIMEOUT + MAX_FALLBACK_TIMEOUT).then(() => {
    throw new Error("timeout");
  });
  const race = Promise.race([promise, escapePromise]);

  return race.catch(async (error) => {
    delete promises[id];

    const providerUrls = getCurrentRpcUrls(chainId);

    if (error.message === "timeout") {
      emitMetricEvent<MulticallTimeoutEvent>({
        event: "multicall.timeout",
        isError: true,
        data: {
          metricType: "workerTimeout",
          isInMainThread: true,
          errorMessage: `Worker did not respond in time. Falling back to main thread.`,
        },
      });
      // eslint-disable-next-line no-console
      console.error(
        `[executeMulticallWorker] Worker did not respond in time. Falling back to main thread. Job ID: ${id}`,
        request
      );
    } else {
      emitMetricEvent({
        event: "worker.multicall.error",
        isError: true,
        data: {
          isInMainThread: false,
          errorName: error.name,
          errorGroup: "Worker multicall error",
          errorMessage: error.message,
          errorStack: error.stack,
        },
      });

      // eslint-disable-next-line no-console
      console.error(
        `[executeMulticallWorker] Worker execution failed. Falling back to main thread. Job ID: ${id}`,
        error.message,
        error.stack
      );
    }

    // Send debug event for worker fallback
    _debugMulticall?.dispatchEvent({
      type: "worker-fallback",
      isInWorker: false,
      chainId,
      providerUrl: providerUrls.primary,
    });

    return await executeMulticallMainThread(chainId, request);
  });
}
