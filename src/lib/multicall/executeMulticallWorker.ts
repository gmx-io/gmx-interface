import { uniqueId } from "lodash";

import { PRODUCTION_PREVIEW_KEY } from "config/localStorage";
import { sleep } from "lib/sleep";

import MulticallWorker from "./multicall.worker";
import type { MulticallRequestConfig } from "./types";
import { executeMulticall } from "./utils";
import { promiseWithResolvers } from "lib/utils";

const executorWorker: Worker = new MulticallWorker();

const promises: Record<string, { resolve: (value: unknown) => void; reject: (error: unknown) => void }> = {};

executorWorker.onmessage = (event) => {
  const { id, result, error } = event.data;

  const promise = promises[id];

  if (!promise) {
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
export async function executeMulticallWorker(chainId: number, request: MulticallRequestConfig<any>) {
  const id = uniqueId("multicall-");

  executorWorker.postMessage({
    id,
    chainId,
    request,
    PRODUCTION_PREVIEW_KEY: localStorage.getItem(PRODUCTION_PREVIEW_KEY),
  });

  const { promise, resolve, reject } = promiseWithResolvers();
  promises[id] = { resolve, reject };

  const escapePromise = sleep(2_000).then(() => "timeout");
  const race = Promise.race([promise, escapePromise]);

  race.then(async (result) => {
    if (result === "timeout") {
      delete promises[id];

      // eslint-disable-next-line no-console
      console.error("[executeMulticallWorker] Worker did not respond in time. Falling back to main thread.");
      try {
        const result = await executeMulticall(chainId, request);

        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  });

  return promise;
}
