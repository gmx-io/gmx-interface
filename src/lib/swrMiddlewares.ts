import { useEffect } from "react";
import { Cache, Fetcher, Key, unstable_serialize } from "swr";

const counter = {};

export type SWRGCMiddlewareConfig = {
  clearUnusedKeys?: boolean;
};

export const swrGCMiddleware =
  (useSWRNext) => (key: Key, fetcher: Fetcher | null, config: { clearUnusedKeys?: boolean; cache: Cache }) => {
    const { clearUnusedKeys, cache } = config;
    const keyToWatch = clearUnusedKeys ? unstable_serialize(key) : undefined;

    useEffect(() => {
      if (!keyToWatch) {
        return;
      }

      counter[keyToWatch] = (counter[keyToWatch] || 0) + 1;

      return () => {
        counter[keyToWatch]--;

        if (clearUnusedKeys && !counter[keyToWatch]) {
          cache.delete(keyToWatch);
        }
      };
    }, [cache, clearUnusedKeys, keyToWatch]);

    return useSWRNext(key, fetcher, config);
  };
