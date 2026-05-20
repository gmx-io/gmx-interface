import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

import type { RewardsHistoryEntry } from "./types";

const REWARDS_HISTORY_PAGE_SIZE = 1000;

const REWARDS_HISTORY_QUERY = gql`
  query AccountRewardsHistory($account: String!, $limit: Int, $offset: Int) {
    accountRewardsHistory(account: $account, limit: $limit, offset: $offset) {
      totalCount
      items {
        epoch
        volume
        pointsEarned
        pointsSpent
        pointsExpired
        pointsBalance
        rewardsEarned
        rewardsClaimed
      }
    }
  }
`;

type RawRewardsHistoryEntry = {
  epoch: number;
  volume: string;
  pointsEarned: string;
  pointsSpent: string;
  pointsExpired: string;
  pointsBalance: string;
  rewardsEarned: string;
  rewardsClaimed: string;
};

type AccountRewardsHistoryClient = NonNullable<ReturnType<typeof getSubsquidGraphClient>>;

type AccountRewardsHistoryResult = {
  entries: RewardsHistoryEntry[];
  totalCount: number;
  hasNextPage: boolean;
};

export function createEmptyRewardsHistoryEntry(epoch: number, pointsBalance = 0n): RewardsHistoryEntry {
  return {
    epoch,
    volume: 0n,
    pointsEarned: 0n,
    pointsSpent: 0n,
    pointsExpired: 0n,
    pointsBalance,
    rewardsEarned: 0n,
    rewardsClaimed: 0n,
  };
}

export function createEmptyCurrentEpochRewardsHistoryEntry(epoch: number, pointsBalance = 0n): RewardsHistoryEntry {
  return createEmptyRewardsHistoryEntry(epoch, pointsBalance);
}

export function getRewardsHistoryEpochs({
  programStartTimestamp,
  currentEpoch,
  epochDuration,
}: {
  programStartTimestamp: number | undefined;
  currentEpoch: number | undefined;
  epochDuration: number | undefined;
}) {
  if (programStartTimestamp === undefined || currentEpoch === undefined || epochDuration === undefined) {
    return [];
  }

  if (epochDuration <= 0 || currentEpoch < programStartTimestamp) {
    return [];
  }

  const epochs: number[] = [];
  for (let epoch = currentEpoch; epoch >= programStartTimestamp; epoch -= epochDuration) {
    epochs.push(epoch);
  }

  return epochs;
}

function isZeroValueRewardsHistoryEntry(entry: RewardsHistoryEntry) {
  return (
    entry.volume === 0n &&
    entry.pointsEarned === 0n &&
    entry.pointsSpent === 0n &&
    entry.pointsExpired === 0n &&
    entry.rewardsEarned === 0n &&
    entry.rewardsClaimed === 0n
  );
}

function fillRewardsHistoryEntries({
  entries,
  epochs,
}: {
  entries: RewardsHistoryEntry[];
  epochs: number[];
}): RewardsHistoryEntry[] {
  const entriesByEpoch = new Map(entries.map((entry) => [entry.epoch, entry]));
  const entriesByTimeAscending = [...entries].sort((a, b) => a.epoch - b.epoch);
  const epochsAscending = [...epochs].reverse();
  const filledEntriesAscending: RewardsHistoryEntry[] = [];
  let lastExistingPointsBalance = 0n;
  let nextEntryIndex = 0;

  for (const epoch of epochsAscending) {
    while (nextEntryIndex < entriesByTimeAscending.length && entriesByTimeAscending[nextEntryIndex].epoch < epoch) {
      if (!isZeroValueRewardsHistoryEntry(entriesByTimeAscending[nextEntryIndex])) {
        lastExistingPointsBalance = entriesByTimeAscending[nextEntryIndex].pointsBalance;
      }

      nextEntryIndex += 1;
    }

    const entry = entriesByEpoch.get(epoch);

    if (entry && !isZeroValueRewardsHistoryEntry(entry)) {
      filledEntriesAscending.push(entry);
      lastExistingPointsBalance = entry.pointsBalance;

      while (nextEntryIndex < entriesByTimeAscending.length && entriesByTimeAscending[nextEntryIndex].epoch <= epoch) {
        nextEntryIndex += 1;
      }
    } else {
      filledEntriesAscending.push({
        ...(entry ?? createEmptyRewardsHistoryEntry(epoch)),
        pointsBalance: lastExistingPointsBalance,
      });

      if (entry) {
        while (
          nextEntryIndex < entriesByTimeAscending.length &&
          entriesByTimeAscending[nextEntryIndex].epoch <= epoch
        ) {
          nextEntryIndex += 1;
        }
      }
    }
  }

  return filledEntriesAscending.reverse();
}

export function fillCurrentEpochRewardsHistoryEntryBalance({
  entries,
  currentEpoch,
  currentPointsBalance,
}: {
  entries: RewardsHistoryEntry[] | undefined;
  currentEpoch: number | undefined;
  currentPointsBalance: bigint | undefined;
}) {
  if (!entries || currentEpoch === undefined || currentPointsBalance === undefined) {
    return entries;
  }

  return entries.map((entry) => {
    if (entry.epoch !== currentEpoch || !isZeroValueRewardsHistoryEntry(entry)) {
      return entry;
    }

    return {
      ...entry,
      pointsBalance: currentPointsBalance,
    };
  });
}

export function fillRewardsHistoryPage({
  entries,
  programStartTimestamp,
  currentEpoch,
  epochDuration,
  limit,
  offset,
}: {
  entries: RewardsHistoryEntry[];
  programStartTimestamp: number;
  currentEpoch: number;
  epochDuration: number;
  limit: number;
  offset: number;
}): AccountRewardsHistoryResult {
  const epochs = getRewardsHistoryEpochs({ programStartTimestamp, currentEpoch, epochDuration });
  const filledEntries = fillRewardsHistoryEntries({ entries, epochs });
  const pageEntries = filledEntries.slice(offset, offset + limit);

  return {
    entries: pageEntries,
    totalCount: epochs.length,
    hasNextPage: offset + pageEntries.length < epochs.length,
  };
}

export function shouldInsertCurrentEpochRewardsHistoryEntry(
  currentEpoch: number | undefined,
  firstEntry: RewardsHistoryEntry | undefined
) {
  return currentEpoch !== undefined && firstEntry?.epoch !== currentEpoch;
}

export function getRewardsHistoryBackendPageParams({
  shouldInsertCurrentEpoch,
  limit,
  offset,
}: {
  shouldInsertCurrentEpoch: boolean;
  limit: number;
  offset: number;
}) {
  if (!shouldInsertCurrentEpoch) {
    return { limit, offset };
  }

  return {
    limit: offset === 0 ? Math.max(limit - 1, 0) : limit,
    offset: Math.max(offset - 1, 0),
  };
}

export function mergeCurrentEpochRewardsHistoryEntry({
  page,
  currentEpoch,
  shouldInsertCurrentEpoch,
  offset,
}: {
  page: AccountRewardsHistoryResult;
  currentEpoch: number | undefined;
  shouldInsertCurrentEpoch: boolean;
  offset: number;
}): AccountRewardsHistoryResult {
  if (!shouldInsertCurrentEpoch || currentEpoch === undefined) {
    return page;
  }

  const entries =
    offset === 0 ? [createEmptyCurrentEpochRewardsHistoryEntry(currentEpoch), ...page.entries] : page.entries;

  return {
    entries,
    totalCount: page.totalCount + 1,
    hasNextPage: offset + entries.length < page.totalCount + 1,
  };
}

function parseRewardsHistoryEntry(e: RawRewardsHistoryEntry): RewardsHistoryEntry {
  return {
    epoch: e.epoch,
    volume: BigInt(e.volume),
    pointsEarned: BigInt(e.pointsEarned),
    pointsSpent: BigInt(e.pointsSpent),
    pointsExpired: BigInt(e.pointsExpired),
    pointsBalance: BigInt(e.pointsBalance),
    rewardsEarned: BigInt(e.rewardsEarned),
    rewardsClaimed: BigInt(e.rewardsClaimed),
  };
}

export function getManualAllocatedPointsFromRewardsHistoryEntries(
  entries: RewardsHistoryEntry[],
  programStartTimestamp: number
) {
  return entries.reduce((sum, entry) => {
    if (entry.epoch < programStartTimestamp && entry.volume === 0n) {
      return sum + entry.pointsEarned;
    }

    return sum;
  }, 0n);
}

async function fetchAccountRewardsHistoryPage({
  client,
  account,
  limit,
  offset,
}: {
  client: AccountRewardsHistoryClient;
  account: string;
  limit: number;
  offset: number;
}) {
  const res = await client.query({
    query: REWARDS_HISTORY_QUERY,
    variables: { account, limit, offset },
    fetchPolicy: "no-cache",
  });

  const accountRewardsHistory = res?.data?.accountRewardsHistory;
  if (!accountRewardsHistory) return undefined;

  return {
    entries: accountRewardsHistory.items.map(parseRewardsHistoryEntry),
    totalCount: accountRewardsHistory.totalCount,
  };
}

async function fetchAllAccountRewardsHistoryEntries({
  client,
  account,
}: {
  client: AccountRewardsHistoryClient;
  account: string;
}) {
  const entries: RewardsHistoryEntry[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const page = await fetchAccountRewardsHistoryPage({
      client,
      account,
      limit: REWARDS_HISTORY_PAGE_SIZE,
      offset,
    });

    if (!page) return undefined;

    entries.push(...page.entries);
    hasMore = page.entries.length > 0 && offset + page.entries.length < page.totalCount;

    if (hasMore) {
      offset += page.entries.length;
    }
  }

  return entries;
}

async function fetchManualAllocatedPoints({
  client,
  account,
  programStartTimestamp,
}: {
  client: AccountRewardsHistoryClient;
  account: string;
  programStartTimestamp: number;
}) {
  let manualAllocatedPoints = 0n;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const page = await fetchAccountRewardsHistoryPage({
      client,
      account,
      limit: REWARDS_HISTORY_PAGE_SIZE,
      offset,
    });

    if (!page) return undefined;

    manualAllocatedPoints += getManualAllocatedPointsFromRewardsHistoryEntries(page.entries, programStartTimestamp);

    if (page.entries.length === 0 || offset + page.entries.length >= page.totalCount) {
      return manualAllocatedPoints;
    }

    offset += page.entries.length;
    hasMore = offset < page.totalCount;
  }

  return manualAllocatedPoints;
}

export function useAccountRewardsHistory(
  chainId: number,
  params: {
    account?: string;
    currentEpoch?: number;
    currentPointsBalance?: bigint;
    programStartTimestamp?: number;
    epochDuration?: number;
    enabled?: boolean;
    limit: number;
    offset: number;
  }
) {
  const {
    account,
    currentEpoch,
    currentPointsBalance,
    programStartTimestamp,
    epochDuration,
    enabled = true,
    limit,
    offset,
  } = params;

  const { data, error, isLoading } = useSWR<AccountRewardsHistoryResult | undefined>(
    enabled && account
      ? [
          "useAccountRewardsHistory",
          chainId,
          account,
          currentEpoch,
          programStartTimestamp,
          epochDuration,
          limit,
          offset,
        ]
      : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client || !account) return undefined;

        const normalizedAccount = account.toLowerCase();

        if (
          currentEpoch !== undefined &&
          programStartTimestamp !== undefined &&
          epochDuration !== undefined &&
          epochDuration > 0
        ) {
          const entries = await fetchAllAccountRewardsHistoryEntries({
            client,
            account: normalizedAccount,
          });
          if (!entries) return undefined;

          return fillRewardsHistoryPage({
            entries,
            currentEpoch,
            programStartTimestamp,
            epochDuration,
            limit,
            offset,
          });
        }

        const firstPage =
          currentEpoch === undefined
            ? undefined
            : await fetchAccountRewardsHistoryPage({
                client,
                account: normalizedAccount,
                limit: 1,
                offset: 0,
              });
        const shouldInsertCurrentEpoch = shouldInsertCurrentEpochRewardsHistoryEntry(
          currentEpoch,
          firstPage?.entries[0]
        );
        const backendPageParams = getRewardsHistoryBackendPageParams({ shouldInsertCurrentEpoch, limit, offset });
        const page = await fetchAccountRewardsHistoryPage({
          client,
          account: normalizedAccount,
          limit: backendPageParams.limit,
          offset: backendPageParams.offset,
        });
        if (!page) return undefined;

        const backendResult = {
          entries: page.entries,
          totalCount: page.totalCount,
          hasNextPage: offset + page.entries.length < page.totalCount,
        };

        return mergeCurrentEpochRewardsHistoryEntry({
          page: backendResult,
          currentEpoch,
          shouldInsertCurrentEpoch,
          offset,
        });
      },
      refreshInterval: 5 * 60_000,
      revalidateOnFocus: false,
    }
  );

  const entries = useMemo(
    () =>
      fillCurrentEpochRewardsHistoryEntryBalance({
        entries: data?.entries,
        currentEpoch,
        currentPointsBalance,
      }),
    [currentEpoch, currentPointsBalance, data?.entries]
  );

  return useMemo(
    () => ({
      data: entries,
      totalCount: data?.totalCount,
      hasNextPage: data?.hasNextPage ?? false,
      error,
      loading: isLoading,
    }),
    [data, entries, error, isLoading]
  );
}

export function useAccountManualRewardsAllocation(
  chainId: number,
  params: { account?: string; programStartTimestamp?: number; enabled?: boolean }
) {
  const { account, programStartTimestamp, enabled = true } = params;

  const { data, error, isLoading } = useSWR<bigint | undefined>(
    enabled && account && programStartTimestamp !== undefined
      ? ["useAccountManualRewardsAllocation", chainId, account, programStartTimestamp]
      : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client || !account || programStartTimestamp === undefined) return undefined;

        return fetchManualAllocatedPoints({
          client,
          account: account.toLowerCase(),
          programStartTimestamp,
        });
      },
      refreshInterval: 5 * 60_000,
      revalidateOnFocus: false,
    }
  );

  return useMemo(() => ({ data, error, loading: isLoading }), [data, error, isLoading]);
}
