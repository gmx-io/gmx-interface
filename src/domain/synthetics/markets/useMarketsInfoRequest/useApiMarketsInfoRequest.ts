import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";

import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { FreshnessMetricId } from "lib/metrics";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";
import type { RawMarketInfo, RawMarketsInfoData } from "sdk/utils/markets/types";
import { toDict } from "sdk/utils/objects";

const mountedAtCache = new Map<ContractsChainId, number>();
const REFRESH_INTERVAL = FREQUENT_UPDATE_INTERVAL;
const API_STALE_MS = 10000;

type ApiMarketsInfoResponse = {
  marketsInfoData: RawMarketsInfoData;
  updatedAt: number;
};

export function useApiMarketsInfoRequest(chainId: ContractsChainId, { enabled = true }: { enabled?: boolean } = {}) {
  const sdk = useGmxSdk(chainId);
  const mountedAtRef = useRef<number | undefined>(mountedAtCache.get(chainId));

  const { data, error } = useSWR<ApiMarketsInfoResponse>(
    enabled ? ["apiMarketsInfoRequest", chainId] : null,
    async () => {
      const marketsInfo: RawMarketInfo[] = await sdk.fetchMarketsInfo();
      const marketsInfoData = toDict(marketsInfo, "marketTokenAddress");
      return {
        marketsInfoData,
        updatedAt: Date.now(),
      };
    },
    {
      refreshInterval: REFRESH_INTERVAL,
    }
  );

  useEffect(() => {
    if (!mountedAtRef.current) {
      const now = Date.now();
      mountedAtRef.current = now;
      mountedAtCache.set(chainId, now);
    }
  }, [chainId]);

  const isStale = useMemo(() => {
    if (!data?.updatedAt) {
      return true;
    }
    let requestedAt = data.updatedAt + REFRESH_INTERVAL;
    return Date.now() - requestedAt > API_STALE_MS;
  }, [data?.updatedAt]);

  useEffect(() => {
    if (data?.marketsInfoData) {
      freshnessMetrics.reportThrottled(chainId, FreshnessMetricId.ApiMarketsInfo);
    }
  }, [chainId, data?.marketsInfoData]);

  return {
    marketsInfoData: data?.marketsInfoData,
    mountedAt: mountedAtRef.current,
    updatedAt: data?.updatedAt,
    isStale,
    error,
  };
}
