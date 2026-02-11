import keyBy from "lodash/keyBy";
import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";

import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { FreshnessMetricId } from "lib/metrics";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";
import type { ApiOrderInfo } from "sdk/utils/orders/types";

const mountedAtCache = new Map<ContractsChainId, number>();
const REFRESH_INTERVAL = FREQUENT_UPDATE_INTERVAL;
const API_STALE_MS = 10000;

type ApiOrdersData = {
  [orderKey: string]: ApiOrderInfo;
};

type ApiOrdersResponse = {
  ordersData: ApiOrdersData;
  updatedAt: number;
};

export function useApiOrdersRequest(
  chainId: ContractsChainId,
  { account, enabled = true }: { account: string | null | undefined; enabled?: boolean }
) {
  const sdk = useGmxSdk(chainId);
  const mountedAtRef = useRef<number | undefined>(mountedAtCache.get(chainId));

  const { data, error } = useSWR<ApiOrdersResponse>(
    enabled && account && sdk ? ["apiOrdersRequest", chainId, account] : null,
    async () => {
      const orders: ApiOrderInfo[] = await sdk!.fetchOrders({ account: account! });
      const ordersData = keyBy(orders, "key");
      return {
        ordersData,
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
    if (data?.ordersData) {
      freshnessMetrics.reportThrottled(chainId, FreshnessMetricId.ApiOrders);
    }
  }, [chainId, data?.ordersData]);

  return {
    ordersData: data?.ordersData,
    mountedAt: mountedAtRef.current,
    updatedAt: data?.updatedAt,
    isStale,
    error,
  };
}
