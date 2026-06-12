import { gql, useQuery as useGqlQuery } from "@apollo/client";
import { useMemo } from "react";
import type { Address } from "viem";

import { MIN_COLLATERAL_USD_IN_LEADERBOARD } from "domain/synthetics/leaderboard/constants";
import { getSubsquidGraphClient } from "lib/indexers";
import { EMPTY_ARRAY } from "lib/objects";

export type PnlSummaryPoint = {
  bucketLabel: string;
  losses: number;
  pnlBps: bigint;
  pnlUsd: bigint;
  volume: bigint;
  volumeRank: number | undefined;
  wins: number;
  winsLossesRatioBps: bigint | undefined;
  usedCapitalUsd: bigint;
} & PnlSummaryPointBreakdownFields;

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

function parseBigInt(value: string | number | bigint | null | undefined) {
  return value !== null && value !== undefined ? BigInt(value) : 0n;
}

function parseRank(value: number | null | undefined) {
  return value ?? undefined;
}

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
        pnlBps: parseBigInt(row.pnlBps),
        pnlUsd: parseBigInt(row.pnlUsd),
        pnlUsdRank: parseRank(row.pnlUsdRank),
        pnlBpsRank: parseRank(row.pnlBpsRank),
        volume: parseBigInt(row.volume),
        volumeRank: parseRank(row.volumeRank),
        wins: row.wins,
        winsLossesRatioBps:
          row.winsLossesRatioBps !== null && row.winsLossesRatioBps !== undefined
            ? parseBigInt(row.winsLossesRatioBps)
            : undefined,
        usedCapitalUsd: parseBigInt(row.usedCapitalUsd),

        realizedSwapImpactUsd: parseBigInt(row.realizedSwapImpactUsd),
        realizedBasePnlUsd: parseBigInt(row.realizedBasePnlUsd),
        realizedFeesUsd: parseBigInt(row.realizedFeesUsd),
        realizedSwapFeesUsd: parseBigInt(row.realizedSwapFeesUsd),
        realizedPriceImpactUsd: parseBigInt(row.realizedPriceImpactUsd),
        unrealizedBasePnlUsd: parseBigInt(row.unrealizedBasePnlUsd),
        unrealizedFeesUsd: parseBigInt(row.unrealizedFeesUsd),
        startUnrealizedBasePnlUsd: parseBigInt(row.startUnrealizedBasePnlUsd),
        startUnrealizedFeesUsd: parseBigInt(row.startUnrealizedFeesUsd),

        unrealizedFeesContributionUsd: parseBigInt(row.unrealizedFeesContributionUsd),
        startUnrealizedBasePnlContributionUsd: parseBigInt(row.startUnrealizedBasePnlContributionUsd),
        openFeesUsd: parseBigInt(row.openFeesUsd),
        closeFeesUsd: parseBigInt(row.closeFeesUsd),
        borrowingFeesUsd: parseBigInt(row.borrowingFeesUsd),
        positiveFundingFeesUsd: parseBigInt(row.positiveFundingFeesUsd),
        negativeFundingFeesUsd: parseBigInt(row.negativeFundingFeesUsd),
        liquidationFeesUsd: parseBigInt(row.liquidationFeesUsd),
        realizedFeesRemainderUsd: parseBigInt(row.realizedFeesRemainderUsd),
        netPriceImpactUsd: parseBigInt(row.netPriceImpactUsd),
        swapFeesUsd: parseBigInt(row.swapFeesUsd),
        swapPriceImpactUsd: parseBigInt(row.swapPriceImpactUsd),
      };
    });
  }, [res.data?.accountPnlSummaryStats]);

  return useMemo(
    () => ({ data: transformedData, error: res.error, loading: res.loading }),
    [res.error, res.loading, transformedData]
  );
}
