import { uniqueId } from "lodash";

import HashDataWorker from "./hashData.worker";

export const hashDataWorker: Worker = new HashDataWorker();

hashDataWorker.onmessage = (event) => {
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

  const promise = new Promise((resolve, reject) => {
    promises.set(id, { resolve, reject });
  });

  return promise as Promise<{
    [K in keyof R]: string;
  }>;
}
