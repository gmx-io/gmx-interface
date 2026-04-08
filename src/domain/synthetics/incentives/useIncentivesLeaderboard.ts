import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

import type { LeaderboardEntry } from "./types";

const LEADERBOARD_EPOCH_QUERY = gql`
  query IncentivesLeaderboard($epoch: Int) {
    incentivesLeaderboard(epoch: $epoch) {
      address
      volume
      pointsEarned
      rewardsEarned
      multiplier
    }
  }
`;

const LEADERBOARD_ALLTIME_QUERY = gql`
  query IncentivesLeaderboardAllTime {
    incentivesLeaderboard {
      address
      volume
      pointsEarned
      rewardsEarned
    }
  }
`;

export function useIncentivesLeaderboard(chainId: number, params: { epoch?: number; enabled?: boolean }) {
  const { epoch, enabled = true } = params;
  const isAllTime = epoch === undefined;

  const { data, error, isLoading } = useSWR<LeaderboardEntry[] | undefined>(
    enabled ? ["useIncentivesLeaderboard", chainId, epoch ?? "all"] : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client) return undefined;

        const res = await client.query({
          query: isAllTime ? LEADERBOARD_ALLTIME_QUERY : LEADERBOARD_EPOCH_QUERY,
          variables: isAllTime ? {} : { epoch },
          fetchPolicy: "no-cache",
        });

        const entries = res?.data?.incentivesLeaderboard;
        if (!entries) return undefined;

        return entries.map(
          (e: {
            address: string;
            volume: string;
            pointsEarned: string;
            rewardsEarned: string;
            multiplier?: number;
          }) => ({
            address: e.address,
            volume: BigInt(e.volume),
            pointsEarned: BigInt(e.pointsEarned),
            rewardsEarned: BigInt(e.rewardsEarned),
            multiplier: e.multiplier,
          })
        );
      },
      refreshInterval: 5 * 60_000,
      revalidateOnFocus: false,
    }
  );

  return useMemo(() => ({ data, error, loading: isLoading }), [data, error, isLoading]);
}
