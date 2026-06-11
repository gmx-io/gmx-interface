import { gql, useQuery as useGqlQuery } from "@apollo/client";
import { useMemo } from "react";
import type { Address } from "viem";

import { ARBITRUM, AVALANCHE_FUJI } from "config/chains";
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
  realizedFeesComponentsComplete: boolean;
  unrealizedFeesComponentsComplete: boolean;
  netPriceImpactUsd: bigint;
  swapFeesUsd: bigint;
  swapPriceImpactUsd: bigint;
};

type PnlSummaryData = PnlSummaryPoint[];

export function isAccountPnlExtendedSchemaSupported(chainId: number) {
  return chainId === ARBITRUM;
}

function isAccountPnlLegacySwapFeesSupported(chainId: number) {
  return chainId !== AVALANCHE_FUJI;
}

const LEGACY_QUERY = gql`
  query AccountHistoricalPnlResolver($account: String!) {
    accountPnlSummaryStats(account: $account) {
      bucketLabel
      losses
      pnlBps
      pnlUsd
      volume
      wins
      winsLossesRatioBps
      usedCapitalUsd

      realizedBasePnlUsd
      realizedFeesUsd
      realizedPriceImpactUsd
      realizedSwapImpactUsd
      unrealizedBasePnlUsd
      unrealizedFeesUsd
      startUnrealizedBasePnlUsd
      startUnrealizedFeesUsd
    }
  }
`;

const LEGACY_QUERY_WITH_SWAP_FEES = gql`
  query AccountHistoricalPnlResolver($account: String!) {
    accountPnlSummaryStats(account: $account) {
      bucketLabel
      losses
      pnlBps
      pnlUsd
      volume
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
    }
  }
`;

const EXTENDED_QUERY = gql`
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
      realizedFeesComponentsComplete
      unrealizedFeesComponentsComplete
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
  const hasExtendedSchema = isAccountPnlExtendedSchemaSupported(chainId);
  const hasLegacySwapFees = isAccountPnlLegacySwapFeesSupported(chainId);
  const query = hasExtendedSchema ? EXTENDED_QUERY : hasLegacySwapFees ? LEGACY_QUERY_WITH_SWAP_FEES : LEGACY_QUERY;

  const res = useGqlQuery(query, {
    client: getSubsquidGraphClient(chainId)!,
    variables: hasExtendedSchema
      ? {
          account: account,
          rankMaxCapitalGte: MIN_COLLATERAL_USD_IN_LEADERBOARD.toString(),
        }
      : {
          account: account,
        },
  });

  const transformedData: PnlSummaryData = useMemo(() => {
    if (!res.data?.accountPnlSummaryStats) {
      return EMPTY_ARRAY;
    }

    return res.data.accountPnlSummaryStats.map((row: any) => {
      const realizedFeesUsd = parseBigInt(row.realizedFeesUsd);
      const realizedSwapFeesUsd = parseBigInt(row.realizedSwapFeesUsd);
      const realizedPriceImpactUsd = parseBigInt(row.realizedPriceImpactUsd);
      const realizedSwapImpactUsd = parseBigInt(row.realizedSwapImpactUsd);
      const unrealizedFeesUsd = parseBigInt(row.unrealizedFeesUsd);
      const startUnrealizedFeesUsd = parseBigInt(row.startUnrealizedFeesUsd);
      const startUnrealizedBasePnlUsd = parseBigInt(row.startUnrealizedBasePnlUsd);

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
        realizedFeesUsd,
        realizedSwapFeesUsd,
        realizedPriceImpactUsd,
        unrealizedBasePnlUsd: parseBigInt(row.unrealizedBasePnlUsd),
        unrealizedFeesUsd,
        startUnrealizedBasePnlUsd,
        startUnrealizedFeesUsd,

        unrealizedFeesContributionUsd: hasExtendedSchema
          ? parseBigInt(row.unrealizedFeesContributionUsd)
          : -unrealizedFeesUsd + startUnrealizedFeesUsd,
        startUnrealizedBasePnlContributionUsd: hasExtendedSchema
          ? parseBigInt(row.startUnrealizedBasePnlContributionUsd)
          : -startUnrealizedBasePnlUsd,
        openFeesUsd: parseBigInt(row.openFeesUsd),
        closeFeesUsd: parseBigInt(row.closeFeesUsd),
        borrowingFeesUsd: parseBigInt(row.borrowingFeesUsd),
        positiveFundingFeesUsd: parseBigInt(row.positiveFundingFeesUsd),
        negativeFundingFeesUsd: parseBigInt(row.negativeFundingFeesUsd),
        liquidationFeesUsd: parseBigInt(row.liquidationFeesUsd),
        realizedFeesRemainderUsd: hasExtendedSchema ? parseBigInt(row.realizedFeesRemainderUsd) : -realizedFeesUsd,
        realizedFeesComponentsComplete: hasExtendedSchema ? row.realizedFeesComponentsComplete ?? true : false,
        unrealizedFeesComponentsComplete: hasExtendedSchema ? row.unrealizedFeesComponentsComplete ?? true : false,
        netPriceImpactUsd: hasExtendedSchema ? parseBigInt(row.netPriceImpactUsd) : realizedPriceImpactUsd,
        swapFeesUsd: hasExtendedSchema ? parseBigInt(row.swapFeesUsd) : -realizedSwapFeesUsd,
        swapPriceImpactUsd: hasExtendedSchema ? parseBigInt(row.swapPriceImpactUsd) : realizedSwapImpactUsd,
      };
    });
  }, [hasExtendedSchema, res.data?.accountPnlSummaryStats]);

  return useMemo(
    () => ({ data: transformedData, error: res.error, loading: res.loading }),
    [res.error, res.loading, transformedData]
  );
}
