import { useMemo } from 'react';
import { usePoolsDetailSquidData } from './usePoolsDetailSquidData';
import {
  buildAverages,
  type AprRangeKey,
  type DetailAprMap,
} from '../utils/aprAverages';
import type { PoolsSquidOptions } from './poolsSquidTypes';

type PoolType = 'GLV' | 'GM';

type UseDetailAprDataParams = {
  poolType?: PoolType;
  tokenAddress?: string;
  marketAddresses?: string[];
  glvAddresses?: string[];
  squidSource?: PoolsSquidOptions['squidSource'];
  enabled?: boolean;
};

export function useDetailAprDataSquid({
  poolType,
  tokenAddress,
  marketAddresses = [],
  glvAddresses = [],
  squidSource = 'detail',
  enabled = true,
}: UseDetailAprDataParams) {
  const shouldFetch = Boolean(enabled && poolType && tokenAddress);

  const { data, isLoading, error } = usePoolsDetailSquidData({
    marketAddresses,
    glvAddresses,
    poolType,
    tokenAddress,
    enabled: shouldFetch && squidSource === 'detail',
  });

  const detailAprMap = useMemo<DetailAprMap>(() => {
    if (!data?.tokenAprRows?.length) {
      return new Map<AprRangeKey, number | null>();
    }
    return buildAverages(data.tokenAprRows);
  }, [data?.tokenAprRows]);

  return {
    detailAprMap,
    isLoading,
    error,
  };
}
