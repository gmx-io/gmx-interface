import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

import type { AccountIncentiveStatus, BoostId, StakingTierId, VolumeTierId } from "./types";

const STATUS_QUERY = gql`
  query AccountIncentiveStatus($account: String!) {
    accountIncentiveStatus(account: $account) {
      account
      pointsBalance
      multiplier
      volumeTier
      stakingTier
      projectedVolumeTier
      projectedStakingTier
      epochTimestamp
      tradedVolume
      boostIds
    }
  }
`;

export function useAccountIncentiveStatus(chainId: number, params: { account?: string; enabled?: boolean }) {
  const { account, enabled = true } = params;

  const { data, error, isLoading } = useSWR<AccountIncentiveStatus | undefined>(
    enabled && account ? ["useAccountIncentiveStatus", chainId, account] : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client || !account) return undefined;

        const res = await client.query({
          query: STATUS_QUERY,
          variables: { account: account.toLowerCase() },
          fetchPolicy: "no-cache",
        });

        const status = res?.data?.accountIncentiveStatus;
        if (!status) return undefined;

        return {
          account: status.account,
          pointsBalance: BigInt(status.pointsBalance),
          multiplier: status.multiplier,
          volumeTier: (status.volumeTier as VolumeTierId) ?? null,
          stakingTier: (status.stakingTier as StakingTierId) ?? null,
          projectedVolumeTier: (status.projectedVolumeTier as VolumeTierId) ?? null,
          projectedStakingTier: (status.projectedStakingTier as StakingTierId) ?? null,
          epochTimestamp: status.epochTimestamp,
          tradedVolume: BigInt(status.tradedVolume),
          boostIds: (status.boostIds as BoostId[]) ?? [],
        };
      },
      refreshInterval: 5_000,
      revalidateOnFocus: false,
    }
  );

  return useMemo(() => ({ data, error, loading: isLoading }), [data, error, isLoading]);
}
