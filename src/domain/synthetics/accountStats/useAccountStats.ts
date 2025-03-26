import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/subgraph";

export type AccountStats = {
  closedCount: number;
  cumsumCollateral: bigint;
  cumsumSize: bigint;
  losses: number;
  maxCapital: bigint;
  netCapital: bigint;
  realizedFees: bigint;
  realizedPnl: bigint;
  realizedPriceImpact: bigint;
  sumMaxSize: bigint;
  volume: bigint;
  wins: number;
  id: string;
};

export function useAccountStats(chainId: number, params: { account?: string; enabled?: boolean }) {
  const { account, enabled = true } = params;

  const { data, error, isLoading } = useSWR<AccountStats | undefined>(
    enabled && account ? ["useAccountStats", chainId, account] : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        const res = await client?.query({
          query: gql`
            query AccountStats($account: String!) {
              accountStats(where: { id_eq: $account }) {
                closedCount
                cumsumCollateral
                cumsumSize
                losses
                maxCapital
                netCapital
                realizedFees
                realizedPnl
                realizedPriceImpact
                sumMaxSize
                volume
                wins
                id
              }
            }
          `,
          variables: { account },
          fetchPolicy: "no-cache",
        });

        const stats = res?.data?.accountStats[0];

        if (!stats) {
          return undefined;
        }

        return {
          closedCount: stats.closedCount,
          cumsumCollateral: BigInt(stats.cumsumCollateral),
          cumsumSize: BigInt(stats.cumsumSize),
          losses: stats.losses,
          maxCapital: BigInt(stats.maxCapital),
          netCapital: BigInt(stats.netCapital),
          realizedFees: BigInt(stats.realizedFees),
          realizedPnl: BigInt(stats.realizedPnl),
          realizedPriceImpact: BigInt(stats.realizedPriceImpact),
          sumMaxSize: BigInt(stats.sumMaxSize),
          volume: BigInt(stats.volume),
          wins: stats.wins,
          id: stats.id,
        };
      },
    }
  );

  return useMemo(() => ({ data, error, loading: isLoading }), [data, error, isLoading]);
}
