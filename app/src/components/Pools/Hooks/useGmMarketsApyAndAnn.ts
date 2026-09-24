import { useMemo } from 'react';
import { GRAPHQL_ENDPOINT } from '@/config/url';
import useSWR from 'swr';

// Split market and GLV performance types to accurately reflect GraphQL response
interface MarketPerformanceData {
  annPerformance30d: string;
  annPerformance90d: string;
  annPerformanceTotal: string;
  gmPriceApy30d: string;
  gmPriceApy90d: string;
  gmPriceApyTotal: string;
  marketToken: string;
  timestamp: string;
}

interface GlvPerformanceData {
  annPerformance30d: string;
  annPerformance90d: string;
  annPerformanceTotal: string;
  glvPriceApy30d: string;
  glvPriceApy90d: string;
  glvPriceApyTotal: string;
  glvToken: string;
  timestamp: string;
}

interface CombinedApyResponse {
  data: {
    marketGmAnnPerformanceHourlies: MarketPerformanceData[];
    glvAnnPerformanceHourlies: GlvPerformanceData[];
  };
}

const APY_DATA_KEY = 'data_store/apy_data';

export function useGmMarketsApyAndAnn(limitSize: number, marketTokens?: string[], glvTokens?: string[]) {
  const marketTokensJoined = useMemo(
    () => (marketTokens?.slice().sort() ?? []).join(','),
    [marketTokens]
  );
  const glvTokensJoined = useMemo(
    () => (glvTokens?.slice().sort() ?? []).join(','),
    [glvTokens]
  );
  const swrKey = useMemo(() => {
    const hasMarkets = (marketTokens?.length ?? 0) > 0;
    const hasGlv = (glvTokens?.length ?? 0) > 0;
    if (!hasMarkets && !hasGlv) return null;
    return [APY_DATA_KEY, marketTokensJoined, glvTokensJoined, limitSize];
  }, [marketTokensJoined, glvTokensJoined, limitSize, marketTokens, glvTokens]);

  const { data: apyAnnData, isLoading } = useSWR<CombinedApyResponse>(
    swrKey,
    async ([, mtJoined, gtJoined, limit]: [string, string, string, number]) => {
      try {
        const mt = mtJoined ? mtJoined.split(',').filter(Boolean) : [];
        const gt = gtJoined ? gtJoined.split(',').filter(Boolean) : [];
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query MyQuery {
                marketGmAnnPerformanceHourlies(limit: ${limit}, orderBy: timestamp_DESC, where: {marketToken_in: ${JSON.stringify(mt)}}) {
                  gmPriceApy30d
                  gmPriceApy90d
                  gmPriceApyTotal
                  annPerformance30d
                  annPerformance90d
                  annPerformanceTotal
                  timestamp
                  marketToken
                }
                glvAnnPerformanceHourlies(limit: ${gt.length || 0}, orderBy: timestamp_DESC, where: {glvToken_in: ${JSON.stringify(gt)}}) {
                  annPerformance30d
                  annPerformance90d
                  annPerformanceTotal
                  glvPriceApy30d
                  glvPriceApy90d
                  glvPriceApyTotal
                  glvToken
                  timestamp
                }
              }
            `,
          }),
        });

        const result = (await response.json()) as CombinedApyResponse;
        return result;
      } catch (error) {
        console.error('Error fetching APY data:', error);
        return { data: { marketGmAnnPerformanceHourlies: [] } };
      }
    },
    {
      refreshInterval: 60000,
      revalidateOnMount: true,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      keepPreviousData: true,
      dedupingInterval: 60000,
    }
  );
  // console.log('apyAnnData', apyAnnData)
  const gmMarketsApyAnnMap = useMemo(() => {
    if (!apyAnnData?.data?.marketGmAnnPerformanceHourlies) {
      return new Map<string, MarketPerformanceData>();
    }
    return apyAnnData.data.marketGmAnnPerformanceHourlies.reduce((acc, item) => {
      acc.set(item.marketToken, item);
      return acc;
    }, new Map<string, MarketPerformanceData>());
  }, [apyAnnData]);

  const glvMarketsApyAnnMap = useMemo(() => {
    if (!apyAnnData?.data?.glvAnnPerformanceHourlies) {
      return new Map<string, GlvPerformanceData>();
    }
    return apyAnnData.data.glvAnnPerformanceHourlies.reduce((acc, item) => {
      acc.set(item.glvToken, item);
      return acc;
    }, new Map<string, GlvPerformanceData>());
  }, [apyAnnData]);

  return {
    gmMarketsApyAnnMap,
    glvMarketsApyAnnMap,
    isLoading,
  };
}
