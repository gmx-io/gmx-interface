import uniqueId from "lodash/uniqueId";

import { PRODUCTION_PREVIEW_KEY } from "config/localStorage";
import { sleep } from "lib/sleep";
import { promiseWithResolvers } from "lib/utils";

import { emitMetricEvent } from "lib/metrics/emitMetricEvent";
import { MAX_TIMEOUT, MulticallProviderUrls } from "./Multicall";
import { executeMulticallMainThread } from "./executeMulticallMainThread";
import type { MulticallRequestConfig, MulticallResult } from "./types";
import { MetricEventParams, MulticallTimeoutEvent } from "lib/metrics";
import { getAbFlags } from "config/ab";
import { getBestRpcUrl } from "lib/rpc/bestRpcTracker";
import { getFallbackRpcUrl } from "config/chains";

const executorWorker: Worker = new Worker(new URL("./multicall.worker", import.meta.url), { type: "module" });

const promises: Record<string, { resolve: (value: any) => void; reject: (error: any) => void }> = {};

executorWorker.onmessage = (event) => {
  if ("isMetrics" in event.data) {
    emitMetricEvent<MetricEventParams>(event.data.detail);
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
    promise.reject(error);
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

  const providerUrls: MulticallProviderUrls = {
    primary: getBestRpcUrl(chainId),
    secondary: getFallbackRpcUrl(chainId),
  };

  executorWorker.postMessage({
    id,
    chainId,
    providerUrls,
    request,
    abFlags: getAbFlags(),
    PRODUCTION_PREVIEW_KEY: localStorage.getItem(PRODUCTION_PREVIEW_KEY),
  });

  const { promise, resolve, reject } = promiseWithResolvers<MulticallResult<any> | undefined>();
  promises[id] = { resolve, reject };

  const internalMulticallTimeout = MAX_TIMEOUT;
  const bufferTimeout = 500;
  const escapePromise = sleep(internalMulticallTimeout + bufferTimeout).then(() => "timeout");
  const race = Promise.race([promise, escapePromise]);

  race.then(async (result) => {
    if (result === "timeout") {
      delete promises[id];

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
      try {
        const result = await executeMulticallMainThread(chainId, request);

        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  });

  return promise as any;
}
