import { gql, useQuery as useGqlQuery } from "@apollo/client";
import { useMemo } from "react";
import type { Address } from "viem";

import { MIN_COLLATERAL_USD_IN_LEADERBOARD } from "domain/synthetics/leaderboard/constants";
import { getSubsquidGraphClient } from "lib/indexers";
import { toBigInt } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";

export type PnlSummaryPoint = {
  bucketLabel: PnlSummaryBucketLabel;
  losses: number;
  pnlBps: bigint;
  pnlUsd: bigint;
  volume: bigint;
  volumeRank: number | undefined;
  wins: number;
  winsLossesRatioBps: bigint | undefined;
  usedCapitalUsd: bigint;
} & PnlSummaryPointBreakdownFields;

export type PnlSummaryBucketLabel = "today" | "yesterday" | "week" | "month" | "year" | "all";

type PnlSummaryPointBreakdownFields = {
  realizedBasePnlUsd: bigint;
  realizedFeesUsd: bigint;
  realizedSwapFeesUsd: bigint;
  realizedPriceImpactUsd: bigint;
  realizedSwapImpactUsd: bigint;
  unrealizedBasePnlUsd: bigint;
  unrealizedFeesUsd: bigint;
  startUnrealizedBasePnlUsd: bigint;
  startUnrealizedFeesUsd: bigint;

  pnlUsdRank: number | undefined;
  pnlBpsRank: number | undefined;
  unrealizedFeesContributionUsd: bigint;
  startUnrealizedBasePnlContributionUsd: bigint;
  openFeesUsd: bigint;
  closeFeesUsd: bigint;
  borrowingFeesUsd: bigint;
  positiveFundingFeesUsd: bigint;
  negativeFundingFeesUsd: bigint;
  liquidationFeesUsd: bigint;
  realizedFeesRemainderUsd: bigint;
  netPriceImpactUsd: bigint;
  swapFeesUsd: bigint;
  swapPriceImpactUsd: bigint;
};

type PnlSummaryData = PnlSummaryPoint[];

const QUERY = gql`
  query AccountHistoricalPnlResolver($account: String!, $rankMaxCapitalGte: String) {
    accountPnlSummaryStats(account: $account, rankMaxCapitalGte: $rankMaxCapitalGte) {
      bucketLabel
      losses
      pnlBps
      pnlUsd
      pnlUsdRank
      pnlBpsRank
      volume
      volumeRank
      wins
      winsLossesRatioBps
      usedCapitalUsd

      realizedBasePnlUsd
      realizedFeesUsd
      realizedSwapFeesUsd
      realizedPriceImpactUsd
      realizedSwapImpactUsd
      unrealizedBasePnlUsd
      unrealizedFeesUsd
      startUnrealizedBasePnlUsd
      startUnrealizedFeesUsd

      unrealizedFeesContributionUsd
      startUnrealizedBasePnlContributionUsd
      openFeesUsd
      closeFeesUsd
      borrowingFeesUsd
      positiveFundingFeesUsd
      negativeFundingFeesUsd
      liquidationFeesUsd
      realizedFeesRemainderUsd
      netPriceImpactUsd
      swapFeesUsd
      swapPriceImpactUsd
    }
  }
`;

export function usePnlSummaryData(chainId: number, account: Address) {
  const res = useGqlQuery(QUERY, {
    client: getSubsquidGraphClient(chainId)!,
    variables: {
      account: account,
      rankMaxCapitalGte: MIN_COLLATERAL_USD_IN_LEADERBOARD.toString(),
    },
  });

  const transformedData: PnlSummaryData = useMemo(() => {
    if (!res.data?.accountPnlSummaryStats) {
      return EMPTY_ARRAY;
    }

    return res.data.accountPnlSummaryStats.map((row: any) => {
      return {
        bucketLabel: row.bucketLabel,
        losses: row.losses,
        pnlBps: toBigInt(row.pnlBps) ?? 0n,
        pnlUsd: toBigInt(row.pnlUsd) ?? 0n,
        pnlUsdRank: row.pnlUsdRank ?? undefined,
        pnlBpsRank: row.pnlBpsRank ?? undefined,
        volume: toBigInt(row.volume) ?? 0n,
        volumeRank: row.volumeRank ?? undefined,
        wins: row.wins,
        winsLossesRatioBps: toBigInt(row.winsLossesRatioBps),
        usedCapitalUsd: toBigInt(row.usedCapitalUsd) ?? 0n,

        realizedSwapImpactUsd: toBigInt(row.realizedSwapImpactUsd) ?? 0n,
        realizedBasePnlUsd: toBigInt(row.realizedBasePnlUsd) ?? 0n,
        realizedFeesUsd: toBigInt(row.realizedFeesUsd) ?? 0n,
        realizedSwapFeesUsd: toBigInt(row.realizedSwapFeesUsd) ?? 0n,
        realizedPriceImpactUsd: toBigInt(row.realizedPriceImpactUsd) ?? 0n,
        unrealizedBasePnlUsd: toBigInt(row.unrealizedBasePnlUsd) ?? 0n,
        unrealizedFeesUsd: toBigInt(row.unrealizedFeesUsd) ?? 0n,
        startUnrealizedBasePnlUsd: toBigInt(row.startUnrealizedBasePnlUsd) ?? 0n,
        startUnrealizedFeesUsd: toBigInt(row.startUnrealizedFeesUsd) ?? 0n,

        unrealizedFeesContributionUsd: toBigInt(row.unrealizedFeesContributionUsd) ?? 0n,
        startUnrealizedBasePnlContributionUsd: toBigInt(row.startUnrealizedBasePnlContributionUsd) ?? 0n,
        openFeesUsd: toBigInt(row.openFeesUsd) ?? 0n,
        closeFeesUsd: toBigInt(row.closeFeesUsd) ?? 0n,
        borrowingFeesUsd: toBigInt(row.borrowingFeesUsd) ?? 0n,
        positiveFundingFeesUsd: toBigInt(row.positiveFundingFeesUsd) ?? 0n,
        negativeFundingFeesUsd: toBigInt(row.negativeFundingFeesUsd) ?? 0n,
        liquidationFeesUsd: toBigInt(row.liquidationFeesUsd) ?? 0n,
        realizedFeesRemainderUsd: toBigInt(row.realizedFeesRemainderUsd) ?? 0n,
        netPriceImpactUsd: toBigInt(row.netPriceImpactUsd) ?? 0n,
        swapFeesUsd: toBigInt(row.swapFeesUsd) ?? 0n,
        swapPriceImpactUsd: toBigInt(row.swapPriceImpactUsd) ?? 0n,
      };
    });
  }, [res.data?.accountPnlSummaryStats]);

  return useMemo(
    () => ({ data: transformedData, error: res.error, loading: res.loading }),
    [res.error, res.loading, transformedData]
  );
}
