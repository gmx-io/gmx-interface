import { useCallback } from "react";
import useSWR from "swr";
import { BareFetcher, SWRConfiguration } from "swr/_internal";

export function useSequentialTimedSWR<Data = any, Error = any>(
  key: any[] | null | undefined | false,
  config: Omit<SWRConfiguration<Data, Error, BareFetcher<Data>>, "refreshInterval"> & {
    refreshInterval: number;
  }
) {
  let refreshInterval = config.refreshInterval;

  const wrappedFetcher = async (...args) => {
    const fetcher = config.fetcher!;

    const start = Date.now();
    const result = await fetcher(...args);

    return { result, start };
  };

  const getRefreshInterval = useCallback(
    (latestData: { result: Data; start: number }) => {
      if (!latestData) {
        return refreshInterval;
      }

      const wait = Math.max(refreshInterval - (Date.now() - latestData.start), 1);

      return wait;
    },
    [refreshInterval]
  );

  const query = useSWR(key && [...key, refreshInterval], {
    ...config,
    fetcher: wrappedFetcher,
    dedupingInterval: refreshInterval / 2,
    refreshInterval: getRefreshInterval,
  });

  return {
    data: query.data?.result as Data | undefined,
    error: query.error as Error,
    isLoading: query.isLoading,
    isValidating: query.isValidating,
    mutate: query.mutate,
  };
}
