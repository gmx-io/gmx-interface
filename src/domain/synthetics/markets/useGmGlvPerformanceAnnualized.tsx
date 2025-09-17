import { useMemo } from "react";
import useSWR from "swr";

import { PerformanceAnnualizedResponse, PerformancePeriod, useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";

export type PerformanceData = {
  [address: string]: number;
};

export function useGmGlvPerformanceAnnualized({
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
  } = useSWR<PerformanceAnnualizedResponse>(["useGmGlvPerformanceAnnualized", chainId, period], {
    fetcher: async () => {
      return oracleKeeperFetcher.fetchPerformanceAnnualized(period);
    },
  });

  const performance = useMemo(() => {
    if (!apiData) return {};

    return apiData.reduce((acc, item) => {
      acc[item.address] = parseFloat(item.uniswapV2Performance);
      return acc;
    }, {} as PerformanceData);
  }, [apiData]);

  return {
    performance,
    data: apiData,
    error,
    isLoading,
  };
}
