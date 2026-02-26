import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
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

  const mountedAtRef = useRef<number | undefined>(mountedAtCache.get(chainId));

  const { data: response, error } = useSWR<ApiDataResponse<T>>(
    swrKey,
    async () => {
      const data = await fetcher();
      return { data, updatedAt: Date.now() };
    },
    { refreshInterval }
  );

  useEffect(() => {
    if (!mountedAtRef.current) {
      const now = Date.now();
      mountedAtRef.current = now;
      mountedAtCache.set(chainId, now);
    }
  }, [chainId]);

  const [isStale, setIsStale] = useState(true);

  useEffect(() => {
    if (!response?.updatedAt) {
      setIsStale(true);
      return;
    }

    const check = () => {
      setIsStale(Date.now() - response.updatedAt > refreshInterval + apiStaleMs);
    };

    check();
    const intervalId = setInterval(check, refreshInterval);
    return () => clearInterval(intervalId);
  }, [response?.updatedAt, refreshInterval, apiStaleMs]);

  useEffect(() => {
    if (response?.data) {
      freshnessMetrics.reportThrottled(chainId, freshnessMetricId);
    }
  }, [chainId, freshnessMetricId, response?.data]);

  return {
    data: response?.data,
    mountedAt: mountedAtRef.current,
    updatedAt: response?.updatedAt,
    isStale,
    error,
  };
}
