import { uniqueId } from "lodash";

import { PRODUCTION_PREVIEW_KEY } from "config/localStorage";

import MulticallWorker from "./multicall.worker";
import type { MulticallRequestConfig } from "./types";

const executorWorker: Worker = new MulticallWorker();

const promises = new Map<string, { resolve: (value: unknown) => void; reject: (error: unknown) => void }>();

executorWorker.onmessage = (event) => {
  const { id, result, error } = event.data;

  const promise = promises.get(id);

  if (!promise) {
    return;
  }

  if (error) {
    promise.reject(error);
  } else {
    promise.resolve(result);
  }

  promises.delete(id);
};

export async function executeMulticallWorker(chainId: number, request: MulticallRequestConfig<any>) {
  const id = uniqueId("multicall-");

  executorWorker.postMessage({
    id,
    chainId,
    request,
    PRODUCTION_PREVIEW_KEY: localStorage.getItem(PRODUCTION_PREVIEW_KEY),
  });

  const { promise, resolve, reject } = Promise.withResolvers();
  promises.set(id, { resolve, reject });

  return promise;
}
