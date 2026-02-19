import keyBy from "lodash/keyBy";
import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";

import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { FreshnessMetricId } from "lib/metrics";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";
import type { ApiPositionInfo } from "sdk/utils/positions/types";

const mountedAtCache = new Map<ContractsChainId, number>();
const REFRESH_INTERVAL = FREQUENT_UPDATE_INTERVAL;
const API_STALE_MS = 10000;

type ApiPositionsInfoData = {
  [positionKey: string]: ApiPositionInfo;
};

type ApiPositionsInfoResponse = {
  positionsInfoData: ApiPositionsInfoData;
  updatedAt: number;
};

export function useApiPositionsInfoRequest(
  chainId: ContractsChainId,
  { account, enabled = true }: { account: string | null | undefined; enabled?: boolean }
) {
  const sdk = useGmxSdk(chainId);
  const mountedAtRef = useRef<number | undefined>(mountedAtCache.get(chainId));

  const { data, error } = useSWR<ApiPositionsInfoResponse>(
    enabled && account && sdk ? ["apiPositionsInfoRequest", chainId, account] : null,
    async () => {
      const positions: ApiPositionInfo[] = await sdk!.fetchPositionsInfo({
        account: account!,
        includeRelatedOrders: false,
      });
      const positionsInfoData = keyBy(positions, "key");
      return {
        positionsInfoData,
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
    const timeSinceLastUpdate = Date.now() - data.updatedAt;
    return timeSinceLastUpdate > REFRESH_INTERVAL + API_STALE_MS;
  }, [data?.updatedAt]);

  useEffect(() => {
    if (data?.positionsInfoData) {
      freshnessMetrics.reportThrottled(chainId, FreshnessMetricId.ApiPositionsInfo);
    }
  }, [chainId, data?.positionsInfoData]);

  return {
    positionsInfoData: data?.positionsInfoData,
    mountedAt: mountedAtRef.current,
    updatedAt: data?.updatedAt,
    isStale,
    error,
  };
}
