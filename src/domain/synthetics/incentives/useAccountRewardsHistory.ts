import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

import type { RewardsHistoryEntry } from "./types";

const REWARDS_HISTORY_QUERY = gql`
  query AccountRewardsHistory($account: String!) {
    accountRewardsHistory(account: $account) {
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

export function useAccountRewardsHistory(chainId: number, params: { account?: string; enabled?: boolean }) {
  const { account, enabled = true } = params;

  const { data, error, isLoading } = useSWR<RewardsHistoryEntry[] | undefined>(
    enabled && account ? ["useAccountRewardsHistory", chainId, account] : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client || !account) return undefined;

        const res = await client.query({
          query: REWARDS_HISTORY_QUERY,
          variables: { account: account.toLowerCase() },
          fetchPolicy: "no-cache",
        });

        const entries = res?.data?.accountRewardsHistory;
        if (!entries) return undefined;

        return entries.map(
          (e: {
            epoch: number;
            volume: string;
            pointsEarned: string;
            pointsSpent: string;
            pointsExpired: string;
            pointsBalance: string;
            rewardsEarned: string;
            rewardsClaimed: string;
          }) => ({
            epoch: e.epoch,
            volume: BigInt(e.volume),
            pointsEarned: BigInt(e.pointsEarned),
            pointsSpent: BigInt(e.pointsSpent),
            pointsExpired: BigInt(e.pointsExpired),
            pointsBalance: BigInt(e.pointsBalance),
            rewardsEarned: BigInt(e.rewardsEarned),
            rewardsClaimed: BigInt(e.rewardsClaimed),
          })
        );
      },
      refreshInterval: 5 * 60_000,
      revalidateOnFocus: false,
    }
  );

  return useMemo(() => ({ data, error, loading: isLoading }), [data, error, isLoading]);
}
