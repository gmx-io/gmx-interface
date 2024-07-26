import { gql, useQuery as useGqlQuery } from "@apollo/client";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { EMPTY_ARRAY } from "lib/objects";
import { getSubsquidGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import type { Address } from "viem";

export type PnlSummaryPoint = {
  bucketLabel: string;
  losses: number;
  pnlBps: bigint;
  pnlUsd: bigint;
  realizedPnlUsd: bigint;
  unrealizedPnlUsd: bigint;
  startUnrealizedPnlUsd: bigint;
  volume: bigint;
  wins: number;
  winsLossesRatioBps: bigint | undefined;
  usedCapitalUsd: bigint;
} & PnlSummaryPointDebugFields;

export type PnlSummaryPointDebugFields = {
  // #region Debug fields
  // Present only when showDebugValues is true
  realizedBasePnlUsd: bigint;
  realizedFeesUsd: bigint;
  realizedPriceImpactUsd: bigint;
  unrealizedBasePnlUsd: bigint;
  unrealizedFeesUsd: bigint;
  startUnrealizedBasePnlUsd: bigint;
  startUnrealizedFeesUsd: bigint;
  // #endregion
};

type PnlSummaryData = PnlSummaryPoint[];

const PROD_QUERY = gql`
  query AccountHistoricalPnlResolver($account: String!) {
    accountPnlSummaryStats(account: $account) {
      bucketLabel
      losses
      pnlBps
      pnlUsd
      realizedPnlUsd
      unrealizedPnlUsd
      startUnrealizedPnlUsd
      volume
      wins
      winsLossesRatioBps
      usedCapitalUsd
    }
  }
`;

export const DEBUG_QUERY = gql`
  query AccountHistoricalPnlResolver($account: String!) {
    accountPnlSummaryStats(account: $account) {
      bucketLabel
      losses
      pnlBps
      pnlUsd
      realizedPnlUsd
      unrealizedPnlUsd
      startUnrealizedPnlUsd
      volume
      wins
      winsLossesRatioBps
      usedCapitalUsd

      realizedBasePnlUsd
      realizedFeesUsd
      realizedPriceImpactUsd
      unrealizedBasePnlUsd
      unrealizedFeesUsd
      startUnrealizedBasePnlUsd
      startUnrealizedFeesUsd
    }
  }
`;

export function usePnlSummaryData(chainId: number, account: Address) {
  const showDebugValues = useShowDebugValues();

  const res = useGqlQuery(showDebugValues ? DEBUG_QUERY : PROD_QUERY, {
    client: getSubsquidGraphClient(chainId)!,
    variables: { account: account },
  });

  const transformedData: PnlSummaryData = useMemo(() => {
    if (!res.data?.accountPnlSummaryStats) {
      return EMPTY_ARRAY;
    }

    return res.data.accountPnlSummaryStats.map((row: any) => {
      if (showDebugValues) {
        return {
          bucketLabel: row.bucketLabel,
          losses: row.losses,
          pnlBps: BigInt(row.pnlBps),
          pnlUsd: BigInt(row.pnlUsd),
          realizedPnlUsd: BigInt(row.realizedPnlUsd),
          unrealizedPnlUsd: BigInt(row.unrealizedPnlUsd),
          startUnrealizedPnlUsd: BigInt(row.startUnrealizedPnlUsd),
          volume: BigInt(row.volume),
          wins: row.wins,
          winsLossesRatioBps: row.winsLossesRatioBps ? BigInt(row.winsLossesRatioBps) : undefined,
          usedCapitalUsd: BigInt(row.usedCapitalUsd),

          realizedBasePnlUsd: row.realizedBasePnlUsd !== undefined ? BigInt(row.realizedBasePnlUsd) : 0n,
          realizedFeesUsd: row.realizedFeesUsd !== undefined ? BigInt(row.realizedFeesUsd) : 0n,
          realizedPriceImpactUsd: row.realizedPriceImpactUsd !== undefined ? BigInt(row.realizedPriceImpactUsd) : 0n,
          unrealizedBasePnlUsd: row.unrealizedBasePnlUsd !== undefined ? BigInt(row.unrealizedBasePnlUsd) : 0n,
          unrealizedFeesUsd: row.unrealizedFeesUsd !== undefined ? BigInt(row.unrealizedFeesUsd) : 0n,
          startUnrealizedBasePnlUsd:
            row.startUnrealizedBasePnlUsd !== undefined ? BigInt(row.startUnrealizedBasePnlUsd) : 0n,
          startUnrealizedFeesUsd: row.startUnrealizedFeesUsd !== undefined ? BigInt(row.startUnrealizedFeesUsd) : 0n,
        };
      }
      return {
        bucketLabel: row.bucketLabel,
        losses: row.losses,
        pnlBps: BigInt(row.pnlBps),
        pnlUsd: BigInt(row.pnlUsd),
        realizedPnlUsd: BigInt(row.realizedPnlUsd),
        unrealizedPnlUsd: BigInt(row.unrealizedPnlUsd),
        startUnrealizedPnlUsd: BigInt(row.startUnrealizedPnlUsd),
        volume: BigInt(row.volume),
        wins: row.wins,
        winsLossesRatioBps: row.winsLossesRatioBps ? BigInt(row.winsLossesRatioBps) : undefined,
        usedCapitalUsd: BigInt(row.usedCapitalUsd),
      };
    });
  }, [res.data?.accountPnlSummaryStats, showDebugValues]);

  return useMemo(
    () => ({ data: transformedData, error: res.error, loading: res.loading }),
    [res.error, res.loading, transformedData]
  );
}
