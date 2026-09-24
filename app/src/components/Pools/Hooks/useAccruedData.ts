import { GLV_TOKEN_TO_ACCOUNT } from '../utils/glvTokenToAccount';
import { getGmw331Enabled } from '@/config/featureFlagEnable';
import type { PoolsSquidOptions } from './poolsSquidTypes';
import { useMarketDailyStatsLegacy } from './useAccruedDataLegacy';
import { useMarketDailyStatsSquid } from './useAccruedDataSquid';

export { GLV_TOKEN_TO_ACCOUNT };
export type { GlvDailyFeesData } from './useAccruedDataSquid';

export function useMarketDailyStats(
  startTimestamp: string,
  options?: PoolsSquidOptions
) {
  const isGmw331Enabled = getGmw331Enabled();
  const squidEnabled = isGmw331Enabled && options?.enabled !== false;

  const squid = useMarketDailyStatsSquid(startTimestamp, {
    ...options,
    enabled: squidEnabled,
  });
  const legacy = useMarketDailyStatsLegacy(startTimestamp, {
    enabled: !isGmw331Enabled,
  });

  return isGmw331Enabled ? squid : legacy;
}
