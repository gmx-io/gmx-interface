import { useMemo } from "react";
import useSWR from "swr";

import { defined } from "lib/guards";
import { parseValue, PRECISION_DECIMALS } from "lib/numbers";
import { PerformancePeriod, PerformanceSnapshotsResponse, useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";

export type PerformanceSnapshot = {
  performance: bigint;
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
      acc[item.address] = item.snapshots
        .map((snapshot) => {
          const performance = parseValue(snapshot.uniswapV2Performance, PRECISION_DECIMALS);
          if (typeof performance === "undefined") return null;
          return {
            snapshotTimestamp: parseInt(snapshot.snapshotTimestamp),
            performance,
          };
        })
        .filter(defined)
        .sort((a, b) => a.snapshotTimestamp - b.snapshotTimestamp);
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
