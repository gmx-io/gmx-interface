import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

import type { AccountIncentiveDashboard, VolumeTierId, StakingTierId } from "./types";

const DASHBOARD_QUERY = gql`
  query AccountIncentiveDashboardState($account: String!) {
    accountIncentiveDashboardState(account: $account) {
      account
      pointsBalance
      rewardsBalance
      recentStats {
        account
        multiplier
        epochTimestamp
        volumeTier
        stakingTier
        tradedVolume
        boostIds
      }
    }
  }
`;

export function useAccountIncentiveDashboard(chainId: number, params: { account?: string; enabled?: boolean }) {
  const { account, enabled = true } = params;

  const { data, error, isLoading } = useSWR<AccountIncentiveDashboard | undefined>(
    enabled && account ? ["useAccountIncentiveDashboard", chainId, account] : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client || !account) return undefined;

        const res = await client.query({
          query: DASHBOARD_QUERY,
          variables: { account: account.toLowerCase() },
          fetchPolicy: "no-cache",
        });

        const state = res?.data?.accountIncentiveDashboardState;
        if (!state) return undefined;

        return {
          account: state.account,
          pointsBalance: BigInt(state.pointsBalance),
          rewardsBalance: BigInt(state.rewardsBalance),
          recentStats: state.recentStats.map(
            (s: {
              account: string;
              multiplier: number;
              epochTimestamp: number;
              volumeTier: string | null;
              stakingTier: string | null;
              tradedVolume: string;
              boostIds: string[];
            }) => ({
              account: s.account,
              multiplier: s.multiplier,
              epochTimestamp: s.epochTimestamp,
              volumeTier: (s.volumeTier as VolumeTierId) ?? null,
              stakingTier: (s.stakingTier as StakingTierId) ?? null,
              tradedVolume: BigInt(s.tradedVolume),
              boostIds: s.boostIds,
            })
          ),
        };
      },
      refreshInterval: 5_000,
      revalidateOnFocus: false,
    }
  );

  return useMemo(() => ({ data, error, loading: isLoading }), [data, error, isLoading]);
}
