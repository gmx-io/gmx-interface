import type { PoolsSquidOptions } from './poolsSquidTypes';
import { getGmw331Enabled } from '@/config/featureFlagEnable';
import { useDetailAprDataLegacy } from './useDetailAprDataLegacy';
import { useDetailAprDataSquid } from './useDetailAprDataSquid';

type PoolType = 'GLV' | 'GM';

type UseDetailAprDataParams = {
  poolType?: PoolType;
  tokenAddress?: string;
  marketAddresses?: string[];
  glvAddresses?: string[];
  squidSource?: PoolsSquidOptions['squidSource'];
  enabled?: boolean;
};

export function useDetailAprData({
  poolType,
  tokenAddress,
  marketAddresses = [],
  glvAddresses = [],
  squidSource = 'detail',
  enabled = true,
}: UseDetailAprDataParams) {
  const isGmw331Enabled = getGmw331Enabled();
  const squidEnabled = isGmw331Enabled && enabled;

  const squid = useDetailAprDataSquid({
    poolType,
    tokenAddress,
    marketAddresses,
    glvAddresses,
    squidSource,
    enabled: squidEnabled,
  });
  const legacy = useDetailAprDataLegacy({
    poolType,
    tokenAddress,
    enabled: !isGmw331Enabled && enabled,
  });

  return isGmw331Enabled ? squid : legacy;
}
