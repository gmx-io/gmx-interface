import { GRAPHQL_ENDPOINT } from '@/config/url';
import { formatParseUsdToBN } from '@/utils/legacy';
import { BN } from '@coral-xyz/anchor';
import useSWR from 'swr';
import { getTimes } from '../utils/getTimes';

interface PerformanceData {
  annPerformanceTotal: string;
  gmPriceApyTotal: string;
  marketToken: string;
  timestamp: string;
}

interface GlvPerformanceData {
  annPerformanceTotal: string;
  glvPriceApyTotal: string;
  glvToken: string;
  timestamp: string;
}

interface CombinedApyResponse {
  data: {
    marketGmAnnPerformanceHourlies: PerformanceData[];
    glvAnnPerformanceHourlies?: GlvPerformanceData[];
  };
}

type AveragesResult = Record<string, { avgAnnPerformanceTotal: BN; avgGmPriceApyTotal: BN; marketToken: string }>;
type GlvAveragesResult = Record<string, { avgAnnPerformanceTotal: BN; avgGlvPriceApyTotal: BN; glvToken: string }>;

export async function getGmMarketsApyAndAnnBy180(
  limitSize: number,
  marketTokens: string[],
  times: string[],
  glvTokens?: string[]
): Promise<AveragesResult & GlvAveragesResult> {
  // Fetch both GM Markets and GLV APY data in a single GraphQL query
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
              query MyQuery {
                marketGmAnnPerformanceHourlies(limit: ${limitSize * 180}, orderBy: timestamp_DESC, where: {marketToken_in: ${JSON.stringify(marketTokens)},timestamp_in: ${JSON.stringify(times)}}) {
                  gmPriceApyTotal
                  annPerformanceTotal
                  timestamp
                  marketToken
                }
                glvAnnPerformanceHourlies(limit: ${glvTokens?.length * 180}, orderBy: timestamp_DESC, where: {glvToken_in: ${JSON.stringify(glvTokens)},timestamp_in: ${JSON.stringify(times)}}) {
                  annPerformanceTotal
                  glvPriceApyTotal
                  glvToken
                  timestamp
                }
              }
            `,
      }),
    });

    const result = (await response.json()) as CombinedApyResponse;
    const averages: AveragesResult = {};
    const glvAverages: GlvAveragesResult = {};
    if (result?.data?.marketGmAnnPerformanceHourlies?.length) {
      marketTokens?.forEach((marketToken) => {
        const dataList = result.data.marketGmAnnPerformanceHourlies.filter((item) => item.marketToken === marketToken);
        if (dataList && dataList.length) {
          let sumAnn = new BN(0);
          let sumGm = new BN(0);

          dataList.forEach((item) => {
            const annPerformanceTotalBN = formatParseUsdToBN(item.annPerformanceTotal, 20);
            const gmPriceApyTotalBN = formatParseUsdToBN(item.gmPriceApyTotal, 20);
            sumAnn = sumAnn.add(annPerformanceTotalBN);
            sumGm = sumGm.add(gmPriceApyTotalBN);
          });

          const divisor = new BN(dataList?.length);
          const avgAnn = sumAnn.div(divisor);
          const avgGm = sumGm.div(divisor);

          averages[marketToken] = {
            avgAnnPerformanceTotal: avgAnn,
            avgGmPriceApyTotal: avgGm,
            marketToken,
          };
        } else {
          averages[marketToken] = {
            avgAnnPerformanceTotal: new BN(0),
            avgGmPriceApyTotal: new BN(0),
            marketToken,
          };
        }
      });
    }

    if (result?.data?.glvAnnPerformanceHourlies?.length) {
      glvTokens?.forEach((glvToken) => {
        const dataList = result.data.glvAnnPerformanceHourlies!.filter(
          (item) => item.glvToken === glvToken
        );
        if (dataList && dataList.length) {
          let sumAnn = new BN(0);
          let sumGm = new BN(0);

          dataList.forEach((item) => {
            const annPerformanceTotalBN = formatParseUsdToBN(item.annPerformanceTotal, 20);
            const glvPriceApyTotalBN = formatParseUsdToBN(item.glvPriceApyTotal, 20);
            sumAnn = sumAnn.add(annPerformanceTotalBN);
            sumGm = sumGm.add(glvPriceApyTotalBN);
          });

          const divisor = new BN(dataList?.length);
          const avgAnn = sumAnn.div(divisor);
          const avgGm = sumGm.div(divisor);

          glvAverages[glvToken] = {
            avgAnnPerformanceTotal: avgAnn,
            avgGlvPriceApyTotal: avgGm,
            glvToken,
          };
        } else {
          glvAverages[glvToken] = {
            avgAnnPerformanceTotal: new BN(0),
            avgGlvPriceApyTotal: new BN(0),
            glvToken,
          };
        }
      });
    }
    return { ...averages, ...glvAverages } as AveragesResult & GlvAveragesResult;
  } catch (error) {
    console.error('Error fetching APY data:', error);
    return {};
  }
}

export type UseGmMarketsApyAndAnnBy180LegacyParams = {
  enabled?: boolean;
  limitSize: number;
  marketTokens: string[];
  times?: string[];
  glvTokens?: string[];
};

export function useGmMarketsApyAndAnnBy180Legacy({
  enabled = true,
  limitSize,
  marketTokens,
  times,
  glvTokens,
}: UseGmMarketsApyAndAnnBy180LegacyParams) {
  const resolvedTimes = times ?? getTimes();
  const marketKey = [...marketTokens].sort().join(',');
  const glvKey = glvTokens ? [...glvTokens].sort().join(',') : '';
  const timesKey = resolvedTimes.join(',');

  const swrKey =
    enabled && marketTokens.length > 0
      ? ['pools/gm-markets-apy-ann-180-legacy', limitSize, marketKey, timesKey, glvKey]
      : null;

  const { data, isLoading, error } = useSWR(
    swrKey,
    () => getGmMarketsApyAndAnnBy180(limitSize, marketTokens, resolvedTimes, glvTokens),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    gmMarketsApyAndAnnBy180: data ?? {},
    isLoading,
    error,
  };
}
