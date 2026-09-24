import type { PoolsSquidOptions } from './poolsSquidTypes';
import { getGmw331Enabled } from '@/config/featureFlagEnable';
import { useFeeAprChartDataLegacy } from './useFeeAprChartDataLegacy';
import { useFeeAprChartDataSquid } from './useFeeAprChartDataSquid';

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

export type { FeeAprChartPoint } from './useFeeAprChartDataSquid';

export function useFeeAprChartData({
  poolType,
  tokenAddress,
  startTimestamp,
  marketAddresses = [],
  glvAddresses = [],
  squidSource = 'detail',
  enabled = true,
}: UseFeeAprChartDataParams) {
  const isGmw331Enabled = getGmw331Enabled();
  const squidEnabled = isGmw331Enabled && enabled;

  const squid = useFeeAprChartDataSquid({
    poolType,
    tokenAddress,
    startTimestamp,
    marketAddresses,
    glvAddresses,
    squidSource,
    enabled: squidEnabled,
  });
  const legacy = useFeeAprChartDataLegacy({
    poolType,
    tokenAddress,
    startTimestamp,
    enabled: !isGmw331Enabled && enabled,
  });

  return isGmw331Enabled ? squid : legacy;
}
