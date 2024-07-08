import { uniqueId } from "lodash";

import HashDataWorker from "./hashData.worker";

export const hashDataWorker: Worker = new HashDataWorker();

const promises: Record<string, { resolve: (value: unknown) => void; reject: (error: unknown) => void }> = {};

hashDataWorker.onmessage = (event) => {
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

export function hashDataMapAsync<
  R extends Record<string, [dataTypes: string[], dataValues: (string | number | bigint | boolean)[]] | undefined>,
>(
  map: R
): Promise<{
  [K in keyof R]: string;
}> {
  const id = uniqueId("hash-data-worker-");
  hashDataWorker.postMessage({
    id,
    map,
  });

  const { promise, resolve, reject } = Promise.withResolvers();
  promises[id] = { resolve, reject };

  return promise as Promise<{
    [K in keyof R]: string;
  }>;
}
