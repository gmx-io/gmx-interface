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

  const glvPerformance = useMemo(() => {
    if (!apiData) return {};

    return apiData
      .filter((item) => item.entity === "Glv")
      .reduce((acc, item) => {
        acc[item.address] = parseFloat(item.uniswapV2Performance);
        return acc;
      }, {} as PerformanceData);
  }, [apiData]);

  const gmPerformance = useMemo(() => {
    if (!apiData) return {};

    return apiData
      .filter((item) => item.entity === "Market")
      .reduce((acc, item) => {
        acc[item.address] = parseFloat(item.uniswapV2Performance);
        return acc;
      }, {} as PerformanceData);
  }, [apiData]);

  return {
    glvPerformance,
    gmPerformance,
    data: apiData,
    error,
    isLoading,
  };
}
