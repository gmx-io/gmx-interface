import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/subgraph";

export type PeriodAccountStats = {
  closedCount: number;
  cumsumCollateral: bigint;
  cumsumSize: bigint;
  losses: number;
  maxCapital: bigint;
  netCapital: bigint;
  realizedFees: bigint;
  realizedPnl: bigint;
  realizedPriceImpact: bigint;
  startUnrealizedFees: bigint;
  startUnrealizedPnl: bigint;
  startUnrealizedPriceImpact: bigint;
  sumMaxSize: bigint;
  volume: bigint;
  wins: number;
  id: string;
};

export function usePeriodAccountStats(
  chainId: number,
  params: { account?: string; from?: number; to?: number; enabled?: boolean }
) {
  const { account, from, to, enabled = true } = params;

  const { data, error, isLoading } = useSWR<PeriodAccountStats | undefined>(
    enabled && account ? ["usePeriodAccountStats", from, to, chainId, account] : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        const res = await client?.query({
          query: gql`
            query PeriodAccountStats($account: String!, $from: Int, $to: Int) {
              periodAccountStats(where: { id_eq: $account, from: $from, to: $to }) {
                closedCount
                cumsumCollateral
                cumsumSize
                losses
                maxCapital
                netCapital
                realizedFees
                realizedPnl
                realizedPriceImpact
                startUnrealizedFees
                startUnrealizedPnl
                startUnrealizedPriceImpact
                sumMaxSize
                volume
                wins
                id
              }
            }
          `,
          variables: { account, from, to },
          fetchPolicy: "no-cache",
        });

        const stats = res?.data?.periodAccountStats[0];

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
          startUnrealizedFees: BigInt(stats.startUnrealizedFees),
          startUnrealizedPnl: BigInt(stats.startUnrealizedPnl),
          startUnrealizedPriceImpact: BigInt(stats.startUnrealizedPriceImpact),
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
