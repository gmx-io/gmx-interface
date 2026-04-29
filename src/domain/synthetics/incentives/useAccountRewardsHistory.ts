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

    for (const entry of page.entries) {
      if (entry.epoch >= programStartTimestamp) {
        return manualAllocatedPoints;
      }

      if (entry.volume === 0n) {
        manualAllocatedPoints += entry.pointsEarned;
      }
    }

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
  params: { account?: string; enabled?: boolean; limit: number; offset: number }
) {
  const { account, enabled = true, limit, offset } = params;

  const { data, error, isLoading } = useSWR<AccountRewardsHistoryResult | undefined>(
    enabled && account ? ["useAccountRewardsHistory", chainId, account, limit, offset] : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client || !account) return undefined;

        const normalizedAccount = account.toLowerCase();
        const page = await fetchAccountRewardsHistoryPage({
          client,
          account: normalizedAccount,
          limit,
          offset,
        });
        if (!page) return undefined;

        return {
          entries: page.entries,
          totalCount: page.totalCount,
          hasNextPage: offset + page.entries.length < page.totalCount,
        };
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
