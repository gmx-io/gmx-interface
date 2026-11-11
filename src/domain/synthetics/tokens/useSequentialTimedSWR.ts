import { useCallback } from "react";
import useSWR from "swr";
import { BareFetcher, SWRConfiguration } from "swr/_internal";

export function useSequentialTimedSWR<Data = any, Error = any>(
  key: any[] | null | undefined | false,
  config: Omit<SWRConfiguration<Data, Error, BareFetcher<Data>>, "refreshInterval"> & {
    baseInterval: number;
    // only the wait between polls: keying it would serve the other key's older cache on every switch
    pollInterval?: number;
  }
) {
  const { baseInterval, pollInterval = baseInterval, ...swrConfig } = config;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrappedFetcher = async (...args: any[]) => {
    const fetcher = config.fetcher!;

    const start = Date.now();
    const result = await fetcher(...args);

    return { result, start };
  };

  const getPollWait = useCallback(
    (latestData: { result: Data; start: number }) => {
      if (!latestData) {
        return pollInterval;
      }

      const wait = Math.max(pollInterval - (Date.now() - latestData.start), 1);

      return wait;
    },
    [pollInterval]
  );

  const query = useSWR(key && [...key, baseInterval], {
    ...swrConfig,
    fetcher: wrappedFetcher,
    dedupingInterval: baseInterval / 2,
    refreshInterval: getPollWait,
  });

  return {
    data: query.data?.result as Data | undefined,
    error: query.error as Error,
    isLoading: query.isLoading,
    isValidating: query.isValidating,
    mutate: query.mutate,
  };
}
