import { GRAPHQL_ENDPOINT } from '@/config/url';
import { useAnchor } from '@/contexts/anchor';
import { BN } from '@coral-xyz/anchor';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreAccount } from '@/hooks/fetchHooks/useStoreAccount';
import useSWR from 'swr';
import { useMemo } from 'react';
import { getGmw403Enabled } from '@/config/featureFlagEnable';

const GT_REWARD_HISTORY_KEY = 'data_store/gt_reward_history';
const ACTIVE_REFEREE_COUNT_KEY = 'data_store/active_referee_count';
const GT_REWARD_RECORDS_BATCH_SIZE = 200;
const DAY_MS = 24 * 60 * 60 * 1000;
// Document definition: Active = Referee who has generated a referral reward within the past 7 days (rolling time).
const ACTIVE_REFEREE_WINDOW_DAYS = 7;

type GtRewardHistoryOptions = {
  days?: number;
  limit?: number;
  offset?: number;
};

type StoreWithGtDecimals = {
  gt?: {
    decimals?: number;
  };
};

interface GtUpdateResponse {
  data: {
    gtUpdateds: Array<{
      id: string;
      timestamp: string;
      receiverDelta: string;
      kind: 'Reward' | 'Mint' | 'Burn';
      receiver: string;
    }>;
    gtUpdatedsConnection?: {
      totalCount: number;
    };
  };
}

type GtRewardHistoryData = {
  items: GtHistoryItem[];
  totalCount: number;
  /** Indicates whether the server has more records for a non-full fetch. */
  hasMore: boolean;
};

interface GtRewardRecordsResponse {
  data: {
    gtRewardRecords: Array<{
      id: string;
      source: string;
      sourceKind: string;
      timestamp: string;
    }>;
  };
}

export interface GtHistoryItem {
  id: string;
  timestamp: string;
  kind: 'Reward' | 'Mint' | 'Burn';
  amount: string;
  amountBN: BN;
  source?: string;
  sourceKind?: string;
}

async function gqlFetch<T>(query: string): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const json = (await response.json()) as T;
  return json;
}

function toIdInArray(ids: string[]) {
  return `[${ids.map((x) => `"${x}"`).join(',')}]`;
}

function buildGtUpdatesWhere(ownerAddress: string, sinceTimestamp?: string) {
  if (!sinceTimestamp) {
    return `{ receiver_eq: "${ownerAddress}", kind_eq: "Reward" }`;
  }

  return `{ receiver_eq: "${ownerAddress}", kind_eq: "Reward", timestamp_gte: "${sinceTimestamp}" }`;
}

async function fetchReferralRecordsByRewardIds(rewardIds: string[]) {
  const batches = Array.from(
    { length: Math.ceil(rewardIds.length / GT_REWARD_RECORDS_BATCH_SIZE) },
    (_, index) =>
      rewardIds.slice(
        index * GT_REWARD_RECORDS_BATCH_SIZE,
        (index + 1) * GT_REWARD_RECORDS_BATCH_SIZE
      )
  );

  const batchResults = await Promise.all(
    batches.map((batchIds) =>
      gqlFetch<GtRewardRecordsResponse>(`
        query {
          gtRewardRecords(where: { id_in: ${toIdInArray(batchIds)} }) {
            id
            source
            sourceKind
            timestamp
          }
        }
      `)
    )
  );

  return batchResults.flatMap((result) => result.data?.gtRewardRecords ?? []);
}

/**
 * Active referee number 
 *
 * Independently query a fixed 7-day window, without reusing table data — the table data is 
 * affected by the current tab, time window, and pagination offset, and the active count 
 * calculated using it will change with the UI state.
 */
export const useActiveRefereeCount = () => {
  const { owner } = useAnchor();

  const { data, isLoading } = useSWR<number>(
    owner ? [ACTIVE_REFEREE_COUNT_KEY, owner.toBase58()] : null,
    async ([, ownerAddress]: [string, string]) => {
      const since = new Date(
        Date.now() - ACTIVE_REFEREE_WINDOW_DAYS * DAY_MS
      ).toISOString();
      const updatesResult = await gqlFetch<GtUpdateResponse>(`
        query {
          gtUpdateds(
            where: ${buildGtUpdatesWhere(ownerAddress, since)},
            orderBy: timestamp_DESC
          ) {
            id
          }
        }
      `);

      const rewardIds = (updatesResult.data?.gtUpdateds ?? []).map((u) => u.id);
      if (!rewardIds.length) return 0;

      const records = await fetchReferralRecordsByRewardIds(rewardIds);
      const activeSources = new Set(
        records
          .filter((r) => r.sourceKind === 'referral' && r.source)
          .map((r) => r.source)
      );

      return activeSources.size;
    },
    { revalidateOnFocus: false }
  );

  return {
    activeRefereeCount: data,
    isLoading: Boolean(owner) && isLoading,
  };
};

export const useGtRewardHistoryData = (options: GtRewardHistoryOptions = {}) => {
  const { store, isLoading: isStoreLoading } = useStoreAccount(
    GMX_SOLANA_STORE_ADDRESS
  );
  const storeWithGtDecimals = store as StoreWithGtDecimals | undefined;
  const gtDecimals = useMemo(
    () => storeWithGtDecimals?.gt?.decimals,
    [storeWithGtDecimals?.gt?.decimals]
  );
  const { owner } = useAnchor();
  const hasGtDecimals = gtDecimals !== undefined && gtDecimals !== null;
  const sinceTimestamp = useMemo(() => {
    if (!options.days) return undefined;
    return new Date(Date.now() - options.days * DAY_MS).toISOString();
  }, [options.days]);

  const { data: rewardHistoryData, isLoading: isLoadingHistory } = useSWR<GtRewardHistoryData>(
    owner && hasGtDecimals
      ? [
          GT_REWARD_HISTORY_KEY,
          owner.toBase58(),
          sinceTimestamp ?? 'all',
          options.offset ?? 0,
          options.limit ?? 'all',
        ]
      : null,
    async ([, ownerAddress, requestSinceTimestamp, offset, limit]: [
      string,
      string,
      string,
      number,
      number | 'all',
    ]) => {
      try {
        const isFullFetch = limit === undefined || limit === 'all';
        const where = buildGtUpdatesWhere(
          ownerAddress,
          requestSinceTimestamp === 'all' ? undefined : requestSinceTimestamp
        );
        const paginationArgs =
          isFullFetch ? '' : `, offset: ${offset}, limit: ${limit}`;
        // Recent Activity fetches the full window so filtering and pagination use the same record set.
        const connectionQuery =
          isFullFetch
            ? ''
            : `gtUpdatedsConnection(
              where: ${where},
              orderBy: timestamp_DESC
            ) {
              totalCount
            }`;
        const updatesResult = await gqlFetch<GtUpdateResponse>(`
          query {
            gtUpdateds(
              where: ${where},
              orderBy: timestamp_DESC
              ${paginationArgs}
            ) {
              id
              timestamp
              receiverDelta
              kind
              receiver
            }
            ${connectionQuery}
          }
        `);

        const updates = updatesResult.data?.gtUpdateds ?? [];
        const totalCount =
          updatesResult.data?.gtUpdatedsConnection?.totalCount ?? updates.length;
        const hasMore =
          isFullFetch ? false : offset + updates.length < totalCount;
        const rewardUpdates = updates.filter((u) => u.kind === 'Reward');
        if (!rewardUpdates.length) {
          return {
            items: [],
            totalCount: isFullFetch ? 0 : totalCount,
            hasMore,
          };
        }

        const baseHistory: GtHistoryItem[] = rewardUpdates.map((u) => ({
          id: u.id,
          timestamp: u.timestamp,
          kind: u.kind,
          amount: String(u.receiverDelta),
          amountBN: new BN(u.receiverDelta),
        }));

        const rewardIds = rewardUpdates.map((u) => u.id);
        const batches = getGmw403Enabled()
          ? Array.from(
              { length: Math.ceil(rewardIds.length / GT_REWARD_RECORDS_BATCH_SIZE) },
              (_, index) =>
                rewardIds.slice(
                  index * GT_REWARD_RECORDS_BATCH_SIZE,
                  (index + 1) * GT_REWARD_RECORDS_BATCH_SIZE
                )
            )
          : [rewardIds];

        const batchResults = await Promise.all(
          batches.map((batchIds) =>
            gqlFetch<GtRewardRecordsResponse>(`
            query MyQuery {
              gtRewardRecords(where: { id_in: ${toIdInArray(batchIds)} }) {
                id
                source
                sourceKind
                timestamp
              }
            }
          `)
          )
        );
        const rewardRecords = batchResults.flatMap(
          (result) => result.data?.gtRewardRecords ?? []
        );

        const referralRecords = rewardRecords.filter(
          (r) => r.sourceKind === 'referral' && Boolean(r.source)
        );
        const recordById = new Map(referralRecords.map((r) => [r.id, r] as const));

        const items = baseHistory.flatMap((item) => {
          const rec = recordById.get(item.id);
          if (!rec) return [];
          return [{
            ...item,
            source: rec.source,
            sourceKind: rec.sourceKind,
          }];
        });
        return {
          items,
          totalCount: isFullFetch ? items.length : totalCount,
          hasMore,
        };
      } catch (error) {
        console.error('Error fetching GT reward history:', error);
        return { items: [], totalCount: 0, hasMore: false };
      }
    },
    { revalidateOnFocus: false }
  );

  return {
    gtHistory: rewardHistoryData?.items ?? [],
    totalCount: rewardHistoryData?.totalCount ?? 0,
    hasMore: rewardHistoryData?.hasMore ?? false,
    isLoading:
      Boolean(owner) && (isStoreLoading || isLoadingHistory),
  };
};
