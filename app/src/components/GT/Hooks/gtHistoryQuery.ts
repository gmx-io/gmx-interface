import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN_ZERO } from '@/config/constants';
import { formatAmount } from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import type { GtHistoryItem } from './useGtHistoryData';

const GT_REWARD_RECORDS_BATCH_SIZE = 200;
const GT_EARNED_PAGE_SIZE = 500;

export interface GtUpdate {
  id: string;
  timestamp: string;
  receiverDelta: string;
  kind: 'Reward' | 'Mint' | 'Burn';
  receiver: string;
}

interface GtUpdateResponse {
  data: {
    gtUpdateds: GtUpdate[];
  };
}

interface GtRewardRecord {
  id: string;
  sourceKind: string;
}

interface GtRewardRecordsResponse {
  data: {
    gtRewardRecords: GtRewardRecord[];
  };
}

function toIdInArray(ids: string[]) {
  return `[${ids.map((id) => `"${id}"`).join(',')}]`;
}

export async function gqlFetch<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as T & { errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  return json;
}

function buildKindFilter(selectedActionKeys: string[]): string | null {
  if (!selectedActionKeys.length) {
    return null;
  }

  const kinds = new Set<string>();
  for (const key of selectedActionKeys) {
    if (key === 'mint') kinds.add('Mint');
    if (key === 'sell') kinds.add('Burn');
    if (key === 'referral_rewards' || key === 'stake') kinds.add('Reward');
  }

  if (!kinds.size) {
    return null;
  }

  const kindsArray = [...kinds];
  if (kindsArray.length === 1) {
    return `kind_eq: "${kindsArray[0]}"`;
  }
  return `kind_in: [${kindsArray.map((kind) => `"${kind}"`).join(', ')}]`;
}

function buildWhereClause(ownerAddress: string, selectedActionKeys: string[]): string {
  const kindFilter = buildKindFilter(selectedActionKeys);
  if (!kindFilter) {
    return `{ receiver_eq: "${ownerAddress}" }`;
  }
  return `{ receiver_eq: "${ownerAddress}", ${kindFilter} }`;
}

function needsRewardActionFilter(selectedActionKeys: string[]): boolean {
  const hasReferral = selectedActionKeys.includes('referral_rewards');
  const hasStake = selectedActionKeys.includes('stake');
  return (hasReferral || hasStake) && !(hasReferral && hasStake);
}

export async function fetchRewardRecordsByIds(
  ids: string[]
): Promise<Map<string, string>> {
  const rewardRecordsMap = new Map<string, string>();
  if (!ids.length) {
    return rewardRecordsMap;
  }

  for (let i = 0; i < ids.length; i += GT_REWARD_RECORDS_BATCH_SIZE) {
    const batchIds = ids.slice(i, i + GT_REWARD_RECORDS_BATCH_SIZE);
    const result = await gqlFetch<GtRewardRecordsResponse>({
      query: `
        query {
          gtRewardRecords(where: { id_in: ${toIdInArray(batchIds)} }) {
            id
            sourceKind
          }
        }
      `,
    });

    result.data?.gtRewardRecords?.forEach((record) => {
      rewardRecordsMap.set(record.id, record.sourceKind);
    });
  }

  return rewardRecordsMap;
}

export function mapGtUpdatesToHistory(
  updates: GtUpdate[],
  rewardRecordsMap: Map<string, string>,
  gtDecimals: number
): GtHistoryItem[] {
  return updates.map((update) => ({
    id: update.id,
    timestamp: update.timestamp,
    action:
      rewardRecordsMap.get(update.id) === 'referral'
        ? 'referral_rewards'
        : rewardRecordsMap.get(update.id) === 'custom'
          ? 'stake'
          : update.kind === 'Burn'
            ? 'sell'
            : 'mint',
    amount: formatAmount(new BN(update.receiverDelta), gtDecimals, 4, true, true),
    amountBN: new BN(update.receiverDelta),
  }));
}

export async function fetchGtHistoryPage(
  ownerAddress: string,
  page: number,
  pageSize: number,
  selectedActionKeys: string[],
  gtDecimals: number
): Promise<{ items: GtHistoryItem[]; hasMore: boolean }> {
  const offset = (page - 1) * pageSize;
  const where = buildWhereClause(ownerAddress, selectedActionKeys);

  const result = await gqlFetch<GtUpdateResponse>({
    query: `
      query {
        gtUpdateds(
          where: ${where},
          orderBy: timestamp_DESC,
          limit: ${pageSize},
          offset: ${offset}
        ) {
          id
          timestamp
          receiverDelta
          kind
          receiver
        }
      }
    `,
  });

  const updates = result.data?.gtUpdateds ?? [];
  const rewardIds = updates
    .filter((update) => update.kind === 'Reward')
    .map((update) => update.id);
  const rewardRecordsMap = await fetchRewardRecordsByIds(rewardIds);
  let items = mapGtUpdatesToHistory(updates, rewardRecordsMap, gtDecimals);

  if (needsRewardActionFilter(selectedActionKeys)) {
    items = items.filter((item) => selectedActionKeys.includes(item.action));
  }

  return {
    items,
    hasMore: updates.length === pageSize,
  };
}

export async function fetchGtRewardEarnedTotals(
  ownerAddress: string
): Promise<{ referralBN: BN; stakeBN: BN }> {
  let referralBN = BN_ZERO;
  let stakeBN = BN_ZERO;
  let timestampLt: string | null = null;

  while (true) {
    const where = timestampLt
      ? `{ receiver_eq: "${ownerAddress}", kind_eq: "Reward", timestamp_lt: "${timestampLt}" }`
      : `{ receiver_eq: "${ownerAddress}", kind_eq: "Reward" }`;

    const result = await gqlFetch<GtUpdateResponse>({
      query: `
        query {
          gtUpdateds(
            where: ${where},
            orderBy: timestamp_DESC,
            limit: ${GT_EARNED_PAGE_SIZE}
          ) {
            id
            timestamp
            receiverDelta
            kind
          }
        }
      `,
    });

    const batch = result.data?.gtUpdateds ?? [];
    if (!batch.length) {
      break;
    }

    const rewardRecordsMap = await fetchRewardRecordsByIds(
      batch.map((update) => update.id)
    );

    for (const update of batch) {
      const sourceKind = rewardRecordsMap.get(update.id);
      const delta = new BN(update.receiverDelta);
      if (sourceKind === 'referral') {
        referralBN = referralBN.add(delta);
      } else if (sourceKind === 'custom') {
        stakeBN = stakeBN.add(delta);
      }
    }

    if (batch.length < GT_EARNED_PAGE_SIZE) {
      break;
    }

    timestampLt = batch[batch.length - 1].timestamp;
  }

  return { referralBN, stakeBN };
}
