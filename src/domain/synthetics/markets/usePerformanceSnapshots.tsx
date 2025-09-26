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

export function usePerformanceSnapshots({
  chainId,
  period,
  address,
}: {
  chainId: number;
  period: PerformancePeriod;
  address?: string;
}) {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const { data, error, isLoading } = useSWR<PerformanceSnapshotsResponse>(
    ["usePerformanceSnapshots", chainId, period, address],
    {
      fetcher: async () => {
        return oracleKeeperFetcher.fetchPerformanceSnapshots(period, address);
      },
    }
  );

  const performanceSnapshots = useMemo(() => {
    if (!data) return {};

    return data.reduce((acc, item) => {
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
  }, [data]);

  return {
    performanceSnapshots,
    error,
    isLoading,
  };
}
