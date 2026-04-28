import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

import type { RewardsHistoryEntry } from "./types";

const REWARDS_HISTORY_PAGE_SIZE = 1000;

const REWARDS_HISTORY_QUERY = gql`
  query AccountRewardsHistory($account: String!, $limit: Int, $offset: Int) {
    accountRewardsHistory(account: $account, limit: $limit, offset: $offset) {
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

  const entries = res?.data?.accountRewardsHistory;
  if (!entries) return undefined;

  return entries.map(parseRewardsHistoryEntry);
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
    const entries = await fetchAccountRewardsHistoryPage({
      client,
      account,
      limit: REWARDS_HISTORY_PAGE_SIZE,
      offset,
    });

    if (!entries) return undefined;

    for (const entry of entries) {
      if (entry.epoch >= programStartTimestamp) {
        return manualAllocatedPoints;
      }

      if (entry.volume === 0n) {
        manualAllocatedPoints += entry.pointsEarned;
      }
    }

    if (entries.length < REWARDS_HISTORY_PAGE_SIZE) {
      return manualAllocatedPoints;
    }

    offset += entries.length;
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
        const entries = await fetchAccountRewardsHistoryPage({
          client,
          account: normalizedAccount,
          limit: limit + 1,
          offset,
        });
        if (!entries) return undefined;

        return {
          entries: entries.slice(0, limit),
          hasNextPage: entries.length > limit,
        };
      },
      refreshInterval: 5 * 60_000,
      revalidateOnFocus: false,
    }
  );

  return useMemo(
    () => ({ data: data?.entries, hasNextPage: data?.hasNextPage ?? false, error, loading: isLoading }),
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
