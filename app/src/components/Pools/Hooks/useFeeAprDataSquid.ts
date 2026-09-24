import { usePoolsOverviewSquidData } from './usePoolsOverviewSquidData';
import type { PoolsSquidOptions } from './poolsSquidTypes';

export function useFeeAprDataSquid(options?: PoolsSquidOptions) {
  const marketAddresses = options?.marketAddresses ?? [];
  const glvAddresses = options?.glvAddresses ?? [];
  const enabled = options?.enabled !== false;

  const { data, isLoading, error } = usePoolsOverviewSquidData({
    marketAddresses,
    glvAddresses,
    enabled: enabled && (options?.squidSource ?? 'overview') === 'overview',
  });

  return {
    aprMap: data?.aprMap ?? new Map<string, { annualized: number | null }>(),
    aprLastMap:
      data?.aprLastMap ?? new Map<string, { annualized: number | null }>(),
    isLoading,
    error,
  };
}
