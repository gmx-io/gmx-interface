import { useEffect, useReducer, useRef } from "react";
import useSWR, { unstable_serialize } from "swr";
import type { Key } from "swr";

import { FreshnessMetricId } from "lib/metrics";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";

const DEFAULT_REFRESH_INTERVAL = FREQUENT_UPDATE_INTERVAL;
const DEFAULT_API_STALE_MS = 10000;

const mountedAtCache = new Map<ContractsChainId, number>();

type ApiDataResponse<T> = {
  data: T;
  updatedAt: number;
};

type UseApiDataRequestOptions = {
  refreshInterval?: number;
  apiStaleMs?: number;
  enabled?: boolean;
};

export function useApiDataRequest<T>(
  chainId: ContractsChainId,
  swrKey: Key,
  fetcher: () => Promise<T>,
  freshnessMetricId: FreshnessMetricId,
  options?: UseApiDataRequestOptions
) {
  const refreshInterval = options?.refreshInterval ?? DEFAULT_REFRESH_INTERVAL;
  const apiStaleMs = options?.apiStaleMs ?? DEFAULT_API_STALE_MS;
  const enabled = options?.enabled ?? true;

  const mountedAtRef = useRef<number | undefined>(mountedAtCache.get(chainId));

  const { data: response, error } = useSWR<ApiDataResponse<T>>(
    enabled ? swrKey : null,
    async () => {
      const data = await fetcher();
      return { data, updatedAt: Date.now() };
    },
    { refreshInterval }
  );

  // Keep the last response while the request is disabled (e.g. api-health flips) so consumers can
  // keep rendering it instead of flashing a loading state; dropped when the logical key changes.
  const serializedKey = swrKey ? unstable_serialize(swrKey) : undefined;
  const retainedRef = useRef<{ key: string; response: ApiDataResponse<T> } | undefined>(undefined);
  if (response && serializedKey) {
    retainedRef.current = { key: serializedKey, response };
  }
  const effectiveResponse =
    response ??
    (serializedKey && retainedRef.current?.key === serializedKey ? retainedRef.current.response : undefined);

  useEffect(() => {
    if (!mountedAtRef.current) {
      const now = Date.now();
      mountedAtRef.current = now;
      mountedAtCache.set(chainId, now);
    }
  }, [chainId]);

  const [, forceStaleCheck] = useReducer((tick: number) => tick + 1, 0);

  useEffect(() => {
    if (!effectiveResponse?.updatedAt) {
      return;
    }

    const intervalId = setInterval(() => {
      forceStaleCheck();
    }, refreshInterval);
    return () => clearInterval(intervalId);
  }, [effectiveResponse?.updatedAt, refreshInterval, apiStaleMs]);

  useEffect(() => {
    if (response?.data) {
      freshnessMetrics.reportThrottled(chainId, freshnessMetricId);
    }
  }, [chainId, freshnessMetricId, response?.data]);

  const isCurrentResponseStale = effectiveResponse?.updatedAt
    ? Date.now() - effectiveResponse.updatedAt > refreshInterval + apiStaleMs
    : false;

  return {
    data: effectiveResponse?.data,
    mountedAt: mountedAtRef.current,
    updatedAt: effectiveResponse?.updatedAt,
    isStale: isCurrentResponseStale,
    error,
  };
}
