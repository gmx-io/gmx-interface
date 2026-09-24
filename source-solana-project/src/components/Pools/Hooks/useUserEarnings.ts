import type { PoolsSquidOptions } from './poolsSquidTypes';
import { getGmw331Enabled } from '@/config/featureFlagEnable';
import { useUserEarningsLegacy } from './useUserEarningsLegacy';
import { useUserEarningsSquid } from './useUserEarningsSquid';

export type { UserEarningsResult } from './useUserEarningsSquid';

export function useUserEarnings(
  marketAddresses: string[],
  glvAddresses: string[],
  options?: PoolsSquidOptions
) {
  const isGmw331Enabled = getGmw331Enabled();
  const squidEnabled = isGmw331Enabled && options?.enabled !== false;

  const squid = useUserEarningsSquid(marketAddresses, glvAddresses, {
    ...options,
    enabled: squidEnabled,
  });
  const legacy = useUserEarningsLegacy(marketAddresses, glvAddresses, {
    enabled: !isGmw331Enabled,
  });

  return isGmw331Enabled ? squid : legacy;
}
