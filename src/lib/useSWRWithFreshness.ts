import useSWR, { type Key, type SWRConfiguration } from "swr";

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

// Same window as useApiDataRequest: refresh interval plus 10s. A failed read keeps its last value until then.
const API_STALE_MS = 10_000;

export function isSnapshotPastGrace(
  asOf: number | undefined,
  hasError: boolean,
  refreshInterval: number,
  now = Date.now()
) {
  return hasError && (asOf === undefined || now - asOf > refreshInterval + API_STALE_MS);
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
  const { data, error: swrError, isLoading } = useSWR<Fetched<Data>>(
    key,
    async (arg: Arg) => ({ value: await fetcher(arg), fetchedAt: Date.now() }),
    { onErrorRetry: retryAtRefreshCadence, ...config }
  );
  const error = asError(swrError);

  return {
    data: data?.value,
    isLoading,
    error,
    freshness: data === undefined ? UNKNOWN : { isStale: error !== undefined, asOf: data.fetchedAt },
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
