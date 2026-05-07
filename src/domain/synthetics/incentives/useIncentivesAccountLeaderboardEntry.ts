import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

import type { LeaderboardEntry } from "./types";

/**
 * Returns the connected user's leaderboard entry along with their global rank
 * for a given epoch (or all-time when epoch is undefined). The result is
 * intended to be displayed as a pinned row on top of every leaderboard page,
 * regardless of which page the user's rank actually falls on.
 *
 * Backend dependency: this hook depends on the indexer exposing a
 * `incentivesLeaderboardAccountEntry(account, epoch)` query that returns a
 * single leaderboard entry plus a `rank` field. If the indexer does not yet
 * expose this query, the hook will resolve to `undefined` data (Apollo will
 * report a GraphQL error for the unknown field) and the consumer can fall
 * back to a partial pinned row derived from the current page.
 */
export type AccountLeaderboardEntry = LeaderboardEntry & { rank: number };

const ACCOUNT_LEADERBOARD_QUERY = gql`
  query IncentivesLeaderboardAccountEntry($account: String!, $epoch: Int) {
    incentivesLeaderboardAccountEntry(account: $account, epoch: $epoch) {
      rank
      address
      volume
      pointsEarned
      rewardsEarned
      multiplier
    }
  }
`;

type RawAccountLeaderboardEntry = {
  rank: number;
  address: string;
  volume: string;
  pointsEarned: string;
  rewardsEarned: string;
  multiplier?: string | number | null;
};

function parseEntry(e: RawAccountLeaderboardEntry): AccountLeaderboardEntry {
  return {
    rank: e.rank,
    address: e.address,
    volume: BigInt(e.volume),
    pointsEarned: BigInt(e.pointsEarned),
    rewardsEarned: BigInt(e.rewardsEarned),
    multiplier: e.multiplier === null || e.multiplier === undefined ? undefined : Number(e.multiplier),
  };
}

export function useIncentivesAccountLeaderboardEntry(
  chainId: number,
  params: { account?: string; epoch?: number; enabled?: boolean }
) {
  const { account, epoch, enabled = true } = params;

  const { data, error, isLoading } = useSWR<AccountLeaderboardEntry | undefined>(
    enabled && account ? ["useIncentivesAccountLeaderboardEntry", chainId, account, epoch ?? "all"] : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client || !account) return undefined;

        const res = await client.query({
          query: ACCOUNT_LEADERBOARD_QUERY,
          variables: { account: account.toLowerCase(), epoch },
          fetchPolicy: "no-cache",
        });

        const entry = res?.data?.incentivesLeaderboardAccountEntry;
        if (!entry) return undefined;

        return parseEntry(entry);
      },
      refreshInterval: 5 * 60_000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  return useMemo(() => ({ data, error, loading: isLoading }), [data, error, isLoading]);
}
