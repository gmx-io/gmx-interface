import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN_ZERO } from '@/config/constants';
import { formatAmount } from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import type { GtHistoryItem } from './useGtHistoryData';

const GT_REWARD_RECORDS_BATCH_SIZE = 200;
const GT_EARNED_PAGE_SIZE = 500;
const GT_BURN_SOLD_PAGE_SIZE = 100;
/** Upstream scan batch when client-filtering Referral/Staking (and any co-selected kinds). */
const GT_HISTORY_SCAN_BATCH_SIZE = 100;

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

interface GtBurnSoldPage {
  id: string;
  receiverDelta: string;
}

interface GtBurnSoldResponse {
  data: {
    gtUpdateds: GtBurnSoldPage[];
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

/** Keyset cursor for stable DESC scans: (timestamp, id). */
interface GtScanCursor {
  timestamp: string;
  id: string;
}

function buildCursorFilter(cursor: GtScanCursor | null | undefined): string | null {
  if (!cursor) {
    return null;
  }
  // Next page after (ts, id) in timestamp_DESC, id_DESC order.
  return `OR: [
    { timestamp_lt: "${cursor.timestamp}" },
    { timestamp_eq: "${cursor.timestamp}", id_lt: "${cursor.id}" }
  ]`;
}

function buildWhereClause(
  ownerAddress: string,
  selectedActionKeys: string[],
  cursor?: GtScanCursor | null
): string {
  const parts = [`receiver_eq: "${ownerAddress}"`];
  const kindFilter = buildKindFilter(selectedActionKeys);
  if (kindFilter) {
    parts.push(kindFilter);
  }
  const cursorFilter = buildCursorFilter(cursor);
  if (cursorFilter) {
    parts.push(cursorFilter);
  }
  return `{ ${parts.join(', ')} }`;
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
    amount: formatAmount(new BN(update.receiverDelta).abs(), gtDecimals, 4, true, true),
    amountBN: new BN(update.receiverDelta).abs(),
  }));
}

async function fetchGtUpdatesBatch(
  where: string,
  limit: number
): Promise<GtUpdate[]> {
  const result = await gqlFetch<GtUpdateResponse>({
    query: `
      query {
        gtUpdateds(
          where: ${where},
          orderBy: [timestamp_DESC, id_DESC],
          limit: ${limit}
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
  return result.data?.gtUpdateds ?? [];
}

/**
 * When only Referral or only Staking is selected (optionally with other actions),
 * GraphQL cannot distinguish Reward subtypes. Query all selected kinds upstream,
 * then client-filter Reward rows to Referral vs Staking while keeping Mint/Burn.
 * Keep scanning until we fill a filtered page or exhaust data.
 */
async function fetchGtHistoryPageWithRewardFilter(
  ownerAddress: string,
  page: number,
  pageSize: number,
  selectedActionKeys: string[],
  gtDecimals: number
): Promise<{ items: GtHistoryItem[]; hasMore: boolean }> {
  const skipNeeded = (page - 1) * pageSize;
  const collected: GtHistoryItem[] = [];
  let skipped = 0;
  let cursor: GtScanCursor | null = null;
  let hasMore = false;

  while (true) {
    const where = buildWhereClause(ownerAddress, selectedActionKeys, cursor);

    const updates = await fetchGtUpdatesBatch(where, GT_HISTORY_SCAN_BATCH_SIZE);
    if (!updates.length) {
      break;
    }

    const rewardIds = updates
      .filter((update) => update.kind === 'Reward')
      .map((update) => update.id);
    const rewardRecordsMap = await fetchRewardRecordsByIds(rewardIds);
    const mapped = mapGtUpdatesToHistory(updates, rewardRecordsMap, gtDecimals);
    const matched = mapped.filter((item) =>
      selectedActionKeys.includes(item.action)
    );

    for (const item of matched) {
      if (skipped < skipNeeded) {
        skipped += 1;
        continue;
      }
      if (collected.length < pageSize) {
        collected.push(item);
        continue;
      }
      // One more matching item beyond this page → more pages exist
      hasMore = true;
      break;
    }

    if (hasMore) {
      break;
    }

    if (updates.length < GT_HISTORY_SCAN_BATCH_SIZE) {
      break;
    }

    const last = updates[updates.length - 1];
    cursor = { timestamp: last.timestamp, id: last.id };
  }

  return { items: collected, hasMore };
}

export async function fetchGtHistoryPage(
  ownerAddress: string,
  page: number,
  pageSize: number,
  selectedActionKeys: string[],
  gtDecimals: number
): Promise<{ items: GtHistoryItem[]; hasMore: boolean }> {
  if (needsRewardActionFilter(selectedActionKeys)) {
    return fetchGtHistoryPageWithRewardFilter(
      ownerAddress,
      page,
      pageSize,
      selectedActionKeys,
      gtDecimals
    );
  }

  const offset = (page - 1) * pageSize;
  const where = buildWhereClause(ownerAddress, selectedActionKeys);

  const result = await gqlFetch<GtUpdateResponse>({
    query: `
      query {
        gtUpdateds(
          where: ${where},
          orderBy: [timestamp_DESC, id_DESC],
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
  const items = mapGtUpdatesToHistory(updates, rewardRecordsMap, gtDecimals);

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
  let cursor: GtScanCursor | null = null;

  while (true) {
    // Both reward actions map to kind=Reward; cursor keeps same-second rows.
    const where = buildWhereClause(
      ownerAddress,
      ['referral_rewards', 'stake'],
      cursor
    );

    const batch = await fetchGtUpdatesBatch(where, GT_EARNED_PAGE_SIZE);
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

    const last = batch[batch.length - 1];
    cursor = { timestamp: last.timestamp, id: last.id };
  }

  return { referralBN, stakeBN };
}

export async function fetchGtBurnSoldTotal(ownerAddress: string): Promise<BN> {
  let soldBN = BN_ZERO;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const result = await gqlFetch<GtBurnSoldResponse>({
      query: `
        query {
          gtUpdateds(
            where: {
              receiver_eq: "${ownerAddress}"
              kind_eq: "Burn"
            }
            orderBy: [timestamp_DESC, id_DESC]
            limit: ${GT_BURN_SOLD_PAGE_SIZE}
            offset: ${offset}
          ) {
            id
            receiverDelta
          }
        }
      `,
    });

    const batch = result.data?.gtUpdateds ?? [];
    if (!batch.length) {
      break;
    }

    for (const update of batch) {
      soldBN = soldBN.add(new BN(update.receiverDelta).abs());
    }

    hasMore = batch.length === GT_BURN_SOLD_PAGE_SIZE;
    if (hasMore) {
      offset += GT_BURN_SOLD_PAGE_SIZE;
    }
  }

  return soldBN;
}
