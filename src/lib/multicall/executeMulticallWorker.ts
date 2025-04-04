import uniqueId from "lodash/uniqueId";

import { MAX_TIMEOUT, MulticallProviderUrls } from "ab/testMultichain/Multicall";
import { getAbFlags } from "config/ab";
import { PRODUCTION_PREVIEW_KEY } from "config/localStorage";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { MetricEventParams, MulticallTimeoutEvent } from "lib/metrics";
import { emitMetricCounter, emitMetricEvent, emitMetricTiming } from "lib/metrics/emitMetricEvent";
import { getCurrentRpcUrls } from "lib/rpc/bestRpcTracker";
import { sleep } from "lib/sleep";

import { executeMulticallMainThread } from "./executeMulticallMainThread";
import type { MulticallRequestConfig, MulticallResult } from "./types";

const executorWorker: Worker = new Worker(new URL("./multicall.worker", import.meta.url), { type: "module" });

const promises: Record<string, { resolve: (value: any) => void; reject: (error: any) => void }> = {};

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

/**
 * Executes a multicall request in a worker.
 * If the worker does not respond in time, it falls back to the main thread.
 */
export async function executeMulticallWorker(
  chainId: number,
  request: MulticallRequestConfig<any>
): Promise<MulticallResult<any> | undefined> {
  const id = uniqueId("multicall-");

  const providerUrls: MulticallProviderUrls = getCurrentRpcUrls(chainId);

  executorWorker.postMessage({
    id,
    chainId,
    providerUrls,
    request,
    abFlags: getAbFlags(),
    isLargeAccount: getIsLargeAccount(),
    PRODUCTION_PREVIEW_KEY: localStorage.getItem(PRODUCTION_PREVIEW_KEY),
  });

  const { promise, resolve, reject } = Promise.withResolvers<MulticallResult<any> | undefined>();
  promises[id] = { resolve, reject };

  const internalMulticallTimeout = MAX_TIMEOUT;
  const bufferTimeout = 500;
  const escapePromise = sleep(internalMulticallTimeout + bufferTimeout).then(() => {
    throw new Error("timeout");
  });
  const race = Promise.race([promise, escapePromise]);

  return race.catch(async (error) => {
    delete promises[id];

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

    return await executeMulticallMainThread(chainId, request);
  });
}
