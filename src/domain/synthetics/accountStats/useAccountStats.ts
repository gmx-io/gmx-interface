import { gql, useQuery as useGqlQuery } from "@apollo/client";
import { getSubsquidGraphClient } from "lib/subgraph";
import { useMemo } from "react";

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

  const res = useGqlQuery(
    gql`
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
    {
      client: getSubsquidGraphClient(chainId)!,
      variables: { account },
      skip: !account || !enabled,
    }
  );

  const result: AccountStats | undefined = useMemo(() => {
    const stats = res.data?.accountStats[0];

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
  }, [res.data]);

  return useMemo(() => ({ data: result, error: res.error, loading: res.loading }), [res.error, res.loading, result]);
}
