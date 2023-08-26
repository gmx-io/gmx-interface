import { useEffect } from "react";
import { unstable_serialize, useSWRConfig } from "swr";

const counter = {};

export const swrGCMiddleware = (useSWRNext) => (key, fetcher, config) => {
  const { cache } = useSWRConfig();
  const serializedKey = unstable_serialize(key);

  useEffect(() => {
    counter[serializedKey] = (counter[serializedKey] || 0) + 1;

    return () => {
      counter[serializedKey]--;

      if (!counter[serializedKey]) {
        cache.delete(serializedKey);
      }
    };
  }, [cache, serializedKey]);

  return useSWRNext(key, fetcher, config);
};
