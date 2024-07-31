import { useCallback } from "react";
import useSWR, { Key } from "swr";
import { BareFetcher, SWRConfiguration, useSWRConfig } from "swr/_internal";

import { sequentialTimedScheduler } from "lib/sequentialTimedScheduler";

export function useSequentialTimedSWR<Data = any, Error = any>(
  key: Key,
  config: Omit<SWRConfiguration<Data, Error, BareFetcher<Data>>, "refreshInterval"> & {
    refreshInterval?: number;
  }
) {
  const defaultConfig = useSWRConfig();
  const defaultRefreshInterval = defaultConfig.refreshInterval;

  const wrappedFetcher = useCallback(
    async (...args) => {
      const fetcher = config.fetcher;

      if (!fetcher) {
        return;
      }

      let refreshInterval = config.refreshInterval;

      if (refreshInterval === undefined && typeof defaultRefreshInterval === "number") {
        refreshInterval = defaultRefreshInterval;
      }

      if (refreshInterval === undefined || refreshInterval <= 0) {
        return fetcher(...args);
      }

      return sequentialTimedScheduler(() => fetcher(...args), refreshInterval, query.mutate);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  ) as BareFetcher<Data>;

  const query = useSWR<Data, Error>(key, {
    ...config,
    refreshInterval: 0,
    fetcher: wrappedFetcher,
  });

  return query;
}
