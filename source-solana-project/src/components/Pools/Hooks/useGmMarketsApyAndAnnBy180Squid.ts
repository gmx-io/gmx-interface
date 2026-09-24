import { usePoolsOverviewSquidData } from './usePoolsOverviewSquidData';
import type { GmMarketsApyAndAnnBy180Map } from './poolsSquidOverview';
import type { PoolsSquidOptions } from './poolsSquidTypes';

export type { GmMarketsApyAndAnnBy180Map, GmMarketApyAnn180Entry, GlvMarketApyAnn180Entry } from './poolsSquidOverview';

export function useGmMarketsApyAndAnnBy180Squid(options?: PoolsSquidOptions) {
  const marketAddresses = options?.marketAddresses ?? [];
  const glvAddresses = options?.glvAddresses ?? [];
  const enabled = options?.enabled !== false;
  const squidSource = options?.squidSource ?? 'overview';

  const { data, isLoading, error } = usePoolsOverviewSquidData({
    marketAddresses,
    glvAddresses,
    enabled: enabled && squidSource === 'overview',
  });

  const gmMarketsApyAndAnnBy180: GmMarketsApyAndAnnBy180Map =
    data?.gmMarketsApyAndAnnBy180 ?? {};

  return { gmMarketsApyAndAnnBy180, isLoading, error };
}
