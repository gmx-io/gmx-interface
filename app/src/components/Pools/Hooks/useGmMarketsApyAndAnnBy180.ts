import type { PoolsSquidOptions } from './poolsSquidTypes';
import { getGmw331Enabled } from '@/config/featureFlagEnable';
import { useGmMarketsApyAndAnnBy180Legacy } from './useGmMarketsApyAndAnnBy180Legacy';
import { useGmMarketsApyAndAnnBy180Squid } from './useGmMarketsApyAndAnnBy180Squid';

export type {
  GmMarketsApyAndAnnBy180Map,
  GmMarketApyAnn180Entry,
  GlvMarketApyAnn180Entry,
} from './poolsSquidOverview';

export { getGmMarketsApyAndAnnBy180 } from './useGmMarketsApyAndAnnBy180Legacy';

export type UseGmMarketsApyAndAnnBy180Params = PoolsSquidOptions & {
  legacyLimitSize?: number;
  legacyMarketTokens?: string[];
  legacyTimes?: string[];
  legacyGlvTokens?: string[];
};

export function useGmMarketsApyAndAnnBy180(options?: UseGmMarketsApyAndAnnBy180Params) {
  const isGmw331Enabled = getGmw331Enabled();
  const squidEnabled = isGmw331Enabled && options?.enabled !== false;

  const squid = useGmMarketsApyAndAnnBy180Squid({
    marketAddresses: options?.marketAddresses,
    glvAddresses: options?.glvAddresses,
    squidSource: options?.squidSource,
    enabled: squidEnabled,
  });
  const legacy = useGmMarketsApyAndAnnBy180Legacy({
    enabled: !isGmw331Enabled,
    limitSize: options?.legacyLimitSize ?? 0,
    marketTokens: options?.legacyMarketTokens ?? [],
    times: options?.legacyTimes,
    glvTokens: options?.legacyGlvTokens,
  });

  return isGmw331Enabled ? squid : legacy;
}
