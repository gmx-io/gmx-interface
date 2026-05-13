import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

import type { LeaderboardEntry } from "./types";

export type IncentivesLeaderboardOrderBy =
  | "volume_ASC"
  | "volume_DESC"
  | "pointsEarned_ASC"
  | "pointsEarned_DESC"
  | "rewardsEarned_ASC"
  | "rewardsEarned_DESC"
  | "multiplier_ASC"
  | "multiplier_DESC";

const LEADERBOARD_QUERY = gql`
  query IncentivesLeaderboard(
    $epoch: Int
    $where: IncentivesLeaderboardWhereInput
    $orderBy: IncentivesLeaderboardOrderByInput
    $limit: Int
    $offset: Int
  ) {
    incentivesLeaderboard(epoch: $epoch, where: $where, orderBy: $orderBy, limit: $limit, offset: $offset) {
      totalCount
      items {
        rank
        address
        volume
        pointsEarned
        rewardsEarned
        multiplier
      }
    }
  }
`;

type RawLeaderboardEntry = {
  rank: number;
  address: string;
  volume: string;
  pointsEarned: string;
  rewardsEarned: string;
  multiplier?: string | number | null;
};

type IncentivesLeaderboardResult = {
  entries: LeaderboardEntry[];
  totalCount: number;
  hasNextPage: boolean;
};

function parseLeaderboardEntry(e: RawLeaderboardEntry): LeaderboardEntry {
  return {
    rank: e.rank,
    address: e.address,
    volume: BigInt(e.volume),
    pointsEarned: BigInt(e.pointsEarned),
    rewardsEarned: BigInt(e.rewardsEarned),
    multiplier: e.multiplier === null || e.multiplier === undefined ? undefined : Number(e.multiplier),
  };
}

export function useIncentivesLeaderboard(
  chainId: number,
  params: {
    epoch?: number;
    where?: { account?: string };
    orderBy?: IncentivesLeaderboardOrderBy;
    enabled?: boolean;
    limit: number;
    offset: number;
  }
) {
  const { epoch, where, orderBy, enabled = true, limit, offset } = params;
  // Lowercase the account here so the SWR cache key (and the indexer call) is
  // deterministic across casings. The resolver normalizes via getAddress, but
  // sending lowercase keeps cache keys consistent.
  const lowercasedAccount = where?.account ? where.account.toLowerCase() : undefined;

  const { data, error, isLoading } = useSWR<IncentivesLeaderboardResult | undefined>(
    enabled
      ? [
          "useIncentivesLeaderboard",
          chainId,
          epoch ?? "all",
          lowercasedAccount ?? "all",
          orderBy ?? "default",
          limit,
          offset,
        ]
      : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client) return undefined;

        const variables: Record<string, unknown> = { epoch, limit, offset };
        if (lowercasedAccount !== undefined) variables.where = { account: lowercasedAccount };
        if (orderBy !== undefined) variables.orderBy = orderBy;

        const res = await client.query({
          query: LEADERBOARD_QUERY,
          variables,
          fetchPolicy: "no-cache",
        });

        const leaderboard = res?.data?.incentivesLeaderboard;
        if (!leaderboard) return undefined;

        return {
          entries: leaderboard.items.map(parseLeaderboardEntry),
          totalCount: leaderboard.totalCount,
          hasNextPage: offset + leaderboard.items.length < leaderboard.totalCount,
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
