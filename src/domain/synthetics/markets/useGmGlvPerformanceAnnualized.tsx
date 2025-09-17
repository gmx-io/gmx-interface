import { useMemo } from "react";
import useSWR from "swr";

import { parseValue, PRECISION_DECIMALS } from "lib/numbers";
import { PerformanceAnnualizedResponse, PerformancePeriod, useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";

export type PerformanceData = {
  [address: string]: bigint;
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
      const performance = parseValue(item.uniswapV2Performance, PRECISION_DECIMALS);
      if (typeof performance === "undefined") return acc;
      acc[item.address] = performance;
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
