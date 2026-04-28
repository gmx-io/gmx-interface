import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

import type { LeaderboardEntry } from "./types";

const LEADERBOARD_QUERY = gql`
  query IncentivesLeaderboard($epoch: Int, $limit: Int, $offset: Int) {
    incentivesLeaderboard(epoch: $epoch, limit: $limit, offset: $offset) {
      totalCount
      items {
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
    address: e.address,
    volume: BigInt(e.volume),
    pointsEarned: BigInt(e.pointsEarned),
    rewardsEarned: BigInt(e.rewardsEarned),
    multiplier: e.multiplier === null || e.multiplier === undefined ? undefined : Number(e.multiplier),
  };
}

export function useIncentivesLeaderboard(
  chainId: number,
  params: { epoch?: number; enabled?: boolean; limit: number; offset: number }
) {
  const { epoch, enabled = true, limit, offset } = params;

  const { data, error, isLoading } = useSWR<IncentivesLeaderboardResult | undefined>(
    enabled ? ["useIncentivesLeaderboard", chainId, epoch ?? "all", limit, offset] : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client) return undefined;

        const res = await client.query({
          query: LEADERBOARD_QUERY,
          variables: {
            epoch,
            limit,
            offset,
          },
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
