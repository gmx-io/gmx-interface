export type PoolsSquidSource = 'overview' | 'detail';

export type PoolsSquidOptions = {
  squidSource?: PoolsSquidSource;
  marketAddresses?: string[];
  glvAddresses?: string[];
  poolType?: 'GLV' | 'GM';
  tokenAddress?: string;
  enabled?: boolean;
};
