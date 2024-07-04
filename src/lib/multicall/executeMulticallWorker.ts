import { uniqueId } from "lodash";
import { PRODUCTION_PREVIEW_KEY } from "config/localStorage";

import MyWorker from "./multicall.worker";

export const executorWorker: Worker = new MyWorker();

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

const promises = new Map<string, { resolve: any; reject: any }>();

export async function executeMulticallWorker(chainId: number, request: any) {
  const id = uniqueId("multicall-");

  executorWorker.postMessage({
    id,
    chainId,
    request,
    PRODUCTION_PREVIEW_KEY: localStorage.getItem(PRODUCTION_PREVIEW_KEY),
  });

  const promise = new Promise((resolve, reject) => {
    promises.set(id, { resolve, reject });
  });

  return promise;
}
