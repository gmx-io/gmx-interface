import { useMemo } from 'react';
import { usePoolsDetailSquidData } from './usePoolsDetailSquidData';
import { parseFeeAprChartPoints } from './poolsSquidDetail';
import type { FeeAprChartPoint } from './poolsSquidDetail';
import type { PoolsSquidOptions } from './poolsSquidTypes';

type PoolType = 'GLV' | 'GM';

type UseFeeAprChartDataParams = {
  poolType?: PoolType;
  tokenAddress?: string;
  startTimestamp?: string;
  marketAddresses?: string[];
  glvAddresses?: string[];
  squidSource?: PoolsSquidOptions['squidSource'];
  enabled?: boolean;
};

export type { FeeAprChartPoint };

export function useFeeAprChartDataSquid({
  poolType,
  tokenAddress,
  startTimestamp,
  marketAddresses = [],
  glvAddresses = [],
  squidSource = 'detail',
  enabled = true,
}: UseFeeAprChartDataParams) {
  const shouldFetch = Boolean(enabled && poolType && tokenAddress);

  const { data, isLoading, error } = usePoolsDetailSquidData({
    marketAddresses,
    glvAddresses,
    poolType,
    tokenAddress,
    enabled: shouldFetch && squidSource === 'detail',
  });

  const feeAprChartData = useMemo<FeeAprChartPoint[]>(() => {
    if (!data?.tokenAprRows) return [];
    return parseFeeAprChartPoints(data.tokenAprRows, startTimestamp);
  }, [data?.tokenAprRows, startTimestamp]);

  return {
    feeAprChartData,
    isLoading,
    error,
  };
}
