import { useEffect, useReducer } from "react";
import useSWR, { type Key, type SWRConfiguration, useSWRConfig } from "swr";

import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

export type Freshness = {
  isStale: boolean;
  asOf: number | undefined;
};

export type SWRWithFreshnessResult<Data> = {
  data: Data | undefined;
  isLoading: boolean;
  error: Error | undefined;
  freshness: Freshness;
};

type Fetched<Data> = {
  value: Data;
  fetchedAt: number;
};

const UNKNOWN: Freshness = { isStale: false, asOf: undefined };

function asError(error: unknown): Error | undefined {
  if (!error) return undefined;
  return error instanceof Error ? error : new Error(String(error));
}

// Keep the same age limit as useApiDataRequest, including requests that have not failed yet.
const API_STALE_MS = 10_000;

export function isSnapshotPastGrace(asOf: number | undefined, refreshInterval: number, now = Date.now()) {
  return asOf !== undefined && now - asOf > refreshInterval + API_STALE_MS;
}

// swr backs off exponentially after repeated failures, which would hold a recovered source back for minutes
export const retryAtRefreshCadence: NonNullable<SWRConfiguration["onErrorRetry"]> = (
  _error,
  _key,
  config,
  revalidate,
  opts
) => {
  const interval =
    typeof config.refreshInterval === "number" && config.refreshInterval > 0
      ? config.refreshInterval
      : CONFIG_UPDATE_INTERVAL;

  setTimeout(() => revalidate(opts), interval);
};

// swr keeps the last good value while a refresh fails, so the value has to carry the time it was fetched
export function useSWRWithFreshness<Data, Arg = any>(
  key: Key,
  fetcher: (arg: Arg) => Promise<Data>,
  config?: SWRConfiguration<Fetched<Data>>
): SWRWithFreshnessResult<Data> {
  const { refreshInterval: inheritedRefreshInterval } = useSWRConfig();
  const {
    data,
    error: swrError,
    isLoading,
  } = useSWR<Fetched<Data>>(key, async (arg: Arg) => ({ value: await fetcher(arg), fetchedAt: Date.now() }), {
    onErrorRetry: retryAtRefreshCadence,
    ...config,
  });
  const error = asError(swrError);
  const configuredRefreshInterval = config?.refreshInterval ?? inheritedRefreshInterval;
  const refreshInterval =
    typeof configuredRefreshInterval === "number" ? configuredRefreshInterval : CONFIG_UPDATE_INTERVAL;
  const asOf = data?.fetchedAt;
  const isExpired = isSnapshotPastGrace(asOf, refreshInterval);
  const [, checkFreshness] = useReducer((tick: number) => tick + 1, 0);

  useEffect(() => {
    if (asOf === undefined || isExpired) return;

    const timeout = setTimeout(checkFreshness, Math.max(0, asOf + refreshInterval + API_STALE_MS + 1 - Date.now()));
    return () => clearTimeout(timeout);
  }, [asOf, refreshInterval, isExpired]);

  return {
    data: data?.value,
    isLoading,
    error,
    freshness: data === undefined ? UNKNOWN : { isStale: error !== undefined || isExpired, asOf: data.fetchedAt },
  };
}

export function mergeFreshness(...items: (Freshness | undefined)[]): Freshness {
  const known = items.filter((item): item is Freshness => item !== undefined);
  const stale = known.filter((item) => item.isStale);
  const times = (stale.length > 0 ? stale : known)
    .map((item) => item.asOf)
    .filter((asOf): asOf is number => asOf !== undefined);

  return { isStale: stale.length > 0, asOf: times.length > 0 ? Math.min(...times) : undefined };
}
