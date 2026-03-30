import { useMemo } from "react";
import useSWR from "swr";

import { parseValue, PRECISION_DECIMALS } from "lib/numbers";
import { PerformanceAnnualizedResponse, PerformancePeriod, useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { ContractsChainId } from "sdk/configs/chains";

export type PerformanceData = {
  [address: string]: bigint;
};

export function usePerformanceAnnualized({
  chainId,
  period,
  address,
}: {
  chainId: number;
  period: PerformancePeriod;
  address?: string;
}) {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId as ContractsChainId);

  const { data, error, isLoading } = useSWR<PerformanceAnnualizedResponse>(
    ["usePerformanceAnnualized", chainId, period, address],
    {
      fetcher: async () => {
        return oracleKeeperFetcher.fetchPerformanceAnnualized(period, address);
      },
    }
  );

  const performance = useMemo(() => {
    if (!data) return {};

    return data.reduce((acc, item) => {
      const performance = parseValue(item.uniswapV2Performance, PRECISION_DECIMALS);
      if (typeof performance === "undefined") return acc;
      acc[item.address] = performance;
      return acc;
    }, {} as PerformanceData);
  }, [data]);

  return {
    performance,
    error,
    isLoading: isLoading && !error,
  };
}
