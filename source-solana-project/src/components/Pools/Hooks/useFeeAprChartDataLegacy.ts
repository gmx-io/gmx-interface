import { GRAPHQL_ENDPOINT } from '@/config/url';
import useSWR from 'swr';

type PoolType = 'GLV' | 'GM';

type AprDailyRecord = {
  timestamp?: string;
  apr?: string | null;
  marketToken?: string;
  glvToken?: string;
};

type GraphqlResponse = {
  data?: {
    marketGmInfoDailies?: AprDailyRecord[];
    glvInfoDailies?: AprDailyRecord[];
  };
  errors?: { message: string }[];
};

export type FeeAprChartPoint = {
  timeStamp: number;
  ydata: number;
};

type UseFeeAprChartDataParams = {
  poolType?: PoolType;
  tokenAddress?: string;
  startTimestamp?: string;
  enabled?: boolean;
};

function parseApr(apr: string | null | undefined): number | null {
  if (apr === null || apr === undefined || apr === '') return null;
  const num = parseFloat(String(apr));
  return Number.isFinite(num) ? num : null;
}

function parseTimestampToSeconds(ts: string | undefined): number | null {
  if (!ts) return null;
  const ms = new Date(ts).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

export function useFeeAprChartDataLegacy({
  poolType,
  tokenAddress,
  startTimestamp,
  enabled = true,
}: UseFeeAprChartDataParams) {
  const isTotalRange = !startTimestamp || startTimestamp === 'total';
  const shouldFetch = Boolean(enabled && poolType && tokenAddress);
  const swrKey = shouldFetch
    ? ['pools/fee-apr/chart', poolType, tokenAddress, isTotalRange ? 'all' : startTimestamp]
    : null;
  
  const { data, isLoading, error } = useSWR<FeeAprChartPoint[], Error>(
    swrKey,
    async () => {
      if (!poolType || !tokenAddress) {
        return [];
      }

      const variables = {
        startTimestamp: startTimestamp || null,
        tokenAddress,
      };

      const query = poolType === 'GM'
        ? isTotalRange
          ? `
            query FeeAprChartAll($tokenAddress: String!) {
              marketGmInfoDailies(
                where: { marketToken_eq: $tokenAddress }
                orderBy: timestamp_DESC
              ) {
                timestamp
                apr
              }
            }
          `
          : `
            query FeeAprChartByRange($startTimestamp: DateTime!, $tokenAddress: String!) {
              marketGmInfoDailies(
                where: { timestamp_gte: $startTimestamp, marketToken_eq: $tokenAddress }
                orderBy: timestamp_DESC
              ) {
                timestamp
                apr
              }
            }
          `
        : isTotalRange
          ? `
            query FeeAprChartAll($tokenAddress: String!) {
              glvInfoDailies(
                where: { glvToken_eq: $tokenAddress }
                orderBy: timestamp_DESC
              ) {
                timestamp
                apr
              }
            }
          `
          : `
            query FeeAprChartByRange($startTimestamp: DateTime!, $tokenAddress: String!) {
              glvInfoDailies(
                where: { timestamp_gte: $startTimestamp, glvToken_eq: $tokenAddress }
                orderBy: timestamp_DESC
              ) {
                timestamp
                apr
              }
            }
          `;

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL response not ok: ${response.status}`);
      }

      const json = (await response.json()) as GraphqlResponse;
      if (json.errors?.length) {
        throw new Error(json.errors.map((item) => item.message).join(', '));
      }

      const sourceRows =
        poolType === 'GM'
          ? json.data?.marketGmInfoDailies || []
          : json.data?.glvInfoDailies || [];

      return sourceRows
        .map((row) => {
          const timeStamp = parseTimestampToSeconds(row.timestamp);
          const ydata = parseApr(row.apr);
          if (timeStamp === null || ydata === null) return null;
          return { timeStamp, ydata };
        })
        .filter((item): item is FeeAprChartPoint => Boolean(item))
        .sort((a, b) => a.timeStamp - b.timeStamp);
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    feeAprChartData: data ?? [],
    isLoading,
    error,
  };
}

