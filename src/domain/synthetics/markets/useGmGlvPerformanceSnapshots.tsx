import { useMemo } from "react";
import useSWR from "swr";

import { PerformancePeriod, PerformanceSnapshotsResponse, useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";

export type PerformanceSnapshot = {
  performance: number;
  snapshotTimestamp: number;
};

export type PerformanceSnapshotsData = {
  [address: string]: PerformanceSnapshot[];
};

export function useGmGlvPerformanceSnapshots({
  chainId,
  period = "7d",
}: {
  chainId: number;
  period?: PerformancePeriod;
}) {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const {
    data: apiData,
    error,
    isLoading,
  } = useSWR<PerformanceSnapshotsResponse>(["useGmGlvPerformanceSnapshots", chainId, period], {
    fetcher: async () => {
      return oracleKeeperFetcher.fetchPerformanceSnapshots(period);
    },
  });

  const performanceSnapshots = useMemo(() => {
    if (!apiData) return {};

    return apiData.reduce((acc, item) => {
      acc[item.address] = item.snapshots.map((snapshot) => ({
        snapshotTimestamp: parseInt(snapshot.snapshotTimestamp),
        performance: parseFloat(snapshot.uniswapV2Performance),
      }));
      return acc;
    }, {} as PerformanceSnapshotsData);
  }, [apiData]);

  return {
    performanceSnapshots,
    data: apiData,
    error,
    isLoading,
  };
}
