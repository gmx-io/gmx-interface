import { GRAPHQL_ENDPOINT } from '@/config/url';
import useSWR from 'swr';
import {
  buildAverages,
  type AprDailyRecord,
  type AprRangeKey,
  type DetailAprMap,
} from '../utils/aprAverages';

type PoolType = 'GLV' | 'GM';

type GraphqlResponse = {
  data?: {
    marketGmInfoDailies?: AprDailyRecord[];
    glvInfoDailies?: AprDailyRecord[];
  };
  errors?: { message: string }[];
};

type UseDetailAprDataParams = {
  poolType?: PoolType;
  tokenAddress?: string;
  enabled?: boolean;
};

export function useDetailAprDataLegacy({ poolType, tokenAddress, enabled = true }: UseDetailAprDataParams) {
  const shouldFetch = Boolean(enabled && poolType && tokenAddress);
  const swrKey = shouldFetch ? ['pools/detail-apr', poolType, tokenAddress] : null;

  const { data, isLoading, error } = useSWR<DetailAprMap, Error>(
    swrKey,
    async () => {
      if (!poolType || !tokenAddress) {
        return new Map();
      }

      const query =
        poolType === 'GM'
          ? `
            query DetailAprByToken($tokenAddress: String!) {
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
            query DetailAprByToken($tokenAddress: String!) {
              glvInfoDailies(
                where: { glvToken_eq: $tokenAddress }
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
          variables: { tokenAddress },
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL response not ok: ${response.status}`);
      }

      const json = (await response.json()) as GraphqlResponse;
      if (json.errors?.length) {
        throw new Error(json.errors.map((item) => item.message).join(', '));
      }

      const rows =
        poolType === 'GM'
          ? json.data?.marketGmInfoDailies || []
          : json.data?.glvInfoDailies || [];

      return buildAverages(rows);
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    detailAprMap: data ?? new Map<AprRangeKey, number | null>(),
    isLoading,
    error,
  };
}
