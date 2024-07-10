import { uniqueId } from "lodash";

import { sleep } from "lib/sleep";

import HashDataWorker from "./hashData.worker";
import { hashDataMap } from "./hashDataMap";

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

/**
 * Hashes a map of data in a worker.
 * If the worker does not respond in time, it falls back to the main thread.
 */
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

  const escapePromise = sleep(1000).then(() => "timeout");
  const race = Promise.race([promise, escapePromise]);

  race.then((result) => {
    if (result === "timeout") {
      delete promises[id];
      // eslint-disable-next-line no-console
      console.error("[hashDataMapAsync] Worker did not respond in time. Falling back to main thread.");
      const result = hashDataMap(map);

      resolve(result);
    }
  });

  return promise as Promise<{
    [K in keyof R]: string;
  }>;
}
