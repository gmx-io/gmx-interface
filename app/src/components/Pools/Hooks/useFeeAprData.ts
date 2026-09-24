import type { PoolsSquidOptions } from './poolsSquidTypes';
import { getGmw331Enabled } from '@/config/featureFlagEnable';
import { useFeeAprDataLegacy } from './useFeeAprDataLegacy';
import { useFeeAprDataSquid } from './useFeeAprDataSquid';

export function useFeeAprData(options?: PoolsSquidOptions) {
  const isGmw331Enabled = getGmw331Enabled();
  const squidEnabled = isGmw331Enabled && options?.enabled !== false;

  const squid = useFeeAprDataSquid({
    ...options,
    enabled: squidEnabled,
  });
  const legacy = useFeeAprDataLegacy({
    enabled: !isGmw331Enabled,
  });

  return isGmw331Enabled ? squid : legacy;
}
