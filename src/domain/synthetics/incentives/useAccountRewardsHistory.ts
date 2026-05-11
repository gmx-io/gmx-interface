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

export function createEmptyCurrentEpochRewardsHistoryEntry(epoch: number): RewardsHistoryEntry {
  return {
    epoch,
    volume: 0n,
    pointsEarned: 0n,
    pointsSpent: 0n,
    pointsExpired: 0n,
    pointsBalance: 0n,
    rewardsEarned: 0n,
    rewardsClaimed: 0n,
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
  params: { account?: string; currentEpoch?: number; enabled?: boolean; limit: number; offset: number }
) {
  const { account, currentEpoch, enabled = true, limit, offset } = params;

  const { data, error, isLoading } = useSWR<AccountRewardsHistoryResult | undefined>(
    enabled && account ? ["useAccountRewardsHistory", chainId, account, currentEpoch, limit, offset] : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client || !account) return undefined;

        const normalizedAccount = account.toLowerCase();
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

  return useMemo(
    () => ({
      data: data?.entries,
      totalCount: data?.totalCount,
      hasNextPage: data?.hasNextPage ?? false,
      error,
      loading: isLoading,
    }),
    [data, error, isLoading]
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
