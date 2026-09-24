import { GRAPHQL_ENDPOINT } from '@/config/url';
import { useAnchor } from '@/contexts/anchor';
import { DEFAULT_SWR_REFRESH_INTERVAL_60S } from '@/config/ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useMemo } from 'react';
import useSWR from 'swr';

export const GM_GLV_HISTORY_PER_PAGE = 10;

export type GmGlvHistoryAction = 'Buy' | 'Sell' | 'Receive' | 'Send';
export type GmGlvHistoryAssetType = 'GM' | 'GLV';
export type GmGlvHistoryScope = 'current' | 'all';

export interface GmGlvHistoryItem {
  id: string;
  action: GmGlvHistoryAction;
  amount: string;
  assetType: GmGlvHistoryAssetType;
  fee: string | null;
  glvToken: string | null;
  marketToken: string | null;
  owner: string;
  price: string | null;
  signedAmount: string | null;
  sourceEventType: string | null;
  timestamp: string;
  token: string | null;
  tokenPair: string | null;
  txHash: string;
}

interface GmGlvHistoryResponse {
  data?: {
    gmGlvHistories: GmGlvHistoryItem[];
    gmGlvHistoriesConnection: {
      totalCount: number;
    };
  };
  errors?: Array<{ message: string }>;
}

interface UseGmGlvHistoryDataParams {
  poolType: 'GLV' | 'GM';
  poolTokenAddress?: string;
  scope: GmGlvHistoryScope;
  page: number;
}

const HISTORY_KEY = 'data_store/gm_glv_history';

function buildWhere(
  owner: string,
  poolType: 'GLV' | 'GM',
  poolTokenAddress: string | undefined,
  scope: GmGlvHistoryScope
): Record<string, string> {
  const where: Record<string, string> = { owner_eq: owner };
  if (scope !== 'current' || !poolTokenAddress) {
    return where;
  }
  // GLV buy/sell also stores marketToken for the underlying GM market.
  // Always constrain by assetType so Current GM does not mix in GLV rows.
  where.assetType_eq = poolType;
  if (poolType === 'GM') {
    where.marketToken_eq = poolTokenAddress;
  } else {
    where.glvToken_eq = poolTokenAddress;
  }
  return where;
}

export function useGmGlvHistoryData({
  poolType,
  poolTokenAddress,
  scope,
  page,
}: UseGmGlvHistoryDataParams) {
  const { owner } = useAnchor();
  const { connected } = useWallet();
  const ownerAddress = owner?.toBase58();
  const offset = Math.max(0, (page - 1) * GM_GLV_HISTORY_PER_PAGE);

  const fetchHistory = useCallback(async () => {
    if (!ownerAddress || !connected) {
      return { items: [] as GmGlvHistoryItem[], totalCount: 0 };
    }

    const where = buildWhere(ownerAddress, poolType, poolTokenAddress, scope);
    const query = `
      query GetGmGlvHistories(
        $where: GmGlvHistoryWhereInput
        $offset: Int!
        $limit: Int!
      ) {
        gmGlvHistories(
          orderBy: timestamp_DESC
          limit: $limit
          offset: $offset
          where: $where
        ) {
          action
          amount
          assetType
          fee
          glvToken
          id
          marketToken
          owner
          price
          signedAmount
          sourceEventType
          timestamp
          token
          tokenPair
          txHash
        }
        gmGlvHistoriesConnection(orderBy: timestamp_DESC, where: $where) {
          totalCount
        }
      }
    `;

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: {
          where,
          offset,
          limit: GM_GLV_HISTORY_PER_PAGE,
        },
      }),
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch gm/glv history: HTTP ${response.status}`);
    }

    const json = (await response.json()) as GmGlvHistoryResponse;
    if (json.errors?.length) {
      throw new Error(json.errors[0]?.message || 'Failed to fetch gm/glv history');
    }

    return {
      items: json.data?.gmGlvHistories ?? [],
      totalCount: json.data?.gmGlvHistoriesConnection?.totalCount ?? 0,
    };
  }, [connected, offset, ownerAddress, poolTokenAddress, poolType, scope]);

  const swrKey =
    connected && ownerAddress
      ? [
          HISTORY_KEY,
          ownerAddress,
          poolType,
          poolTokenAddress || '',
          scope,
          page,
        ]
      : null;

  const { data, isLoading, isValidating, mutate } = useSWR(swrKey, fetchHistory, {
    refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_60S,
    dedupingInterval: 10000,
    revalidateOnFocus: false,
    keepPreviousData: false,
    errorRetryCount: 3,
    shouldRetryOnError: true,
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const totalCount = data?.totalCount ?? 0;

  return {
    items,
    totalCount,
    isLoading: Boolean(swrKey) && (isLoading || (!data && isValidating)),
    refresh: mutate,
  };
}
