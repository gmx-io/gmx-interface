export type PoolDetailRoutePoolType = 'GLV' | 'GM';

export const POOL_DETAIL_PATH = '/pools/poolDetail';

export const normalizePoolDetailRouteType = (
  poolType?: string
): PoolDetailRoutePoolType | undefined => {
  const normalizedType = poolType?.toUpperCase();

  if (normalizedType === 'GLV' || normalizedType === 'GM') {
    return normalizedType;
  }

  return undefined;
};

export const getPoolDetailPath = (
  poolType: PoolDetailRoutePoolType,
  poolAddress: string
) => `${POOL_DETAIL_PATH}/${poolType}/${encodeURIComponent(poolAddress)}`;
