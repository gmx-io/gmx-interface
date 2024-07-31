import { gql, useQuery as useGqlQuery } from "@apollo/client";
import { getSubsquidGraphClient } from "lib/subgraph";
import { useMemo } from "react";

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

  const res = useGqlQuery(
    gql`
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
    {
      client: getSubsquidGraphClient(chainId)!,
      variables: { account, from, to },
      skip: !account || !enabled,
    }
  );

  const result: PeriodAccountStats | undefined = useMemo(() => {
    const stats = res.data?.periodAccountStats[0];

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
  }, [res.data]);

  return useMemo(() => ({ data: result, error: res.error, loading: res.loading }), [res.error, res.loading, result]);
}
