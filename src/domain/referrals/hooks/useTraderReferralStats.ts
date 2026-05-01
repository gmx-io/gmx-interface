import useSWR from "swr";

import { getIndexerUrl } from "config/indexers";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { Query } from "sdk/codegen/subsquid";
import graphqlFetcher from "sdk/utils/graphqlFetcher";
import { toBigInt } from "sdk/utils/numbers";

export type TraderReferralStats = {
  trader: string;
  from: number;
  to: number;
  compareFrom?: number;
  compareTo?: number;
  hasComparison: boolean;
  bucketSizeSeconds: number;
  summary: {
    volumeUsd: bigint;
    volumeUsdDelta?: bigint;
    discountsUsd: bigint;
    discountsUsdDelta?: bigint;
  };
  points: {
    timestamp: number;
    volumeUsd: bigint;
    discountsUsd: bigint;
  }[];
};

const TRADER_REFERRAL_STATS_QUERY = /* GraphQL */ `
  query TraderReferralStats($where: TraderReferralStatsWhereInput) {
    traderReferralStats(where: $where) {
      trader
      from
      to
      compareFrom
      compareTo
      hasComparison
      bucketSizeSeconds
      summary {
        volumeUsd
        volumeUsdDelta
        discountsUsd
        discountsUsdDelta
      }
      points {
        timestamp
        volumeUsd
        discountsUsd
      }
    }
  }
`;

async function fetchTraderReferralStats(params: {
  endpoint: string;
  trader: string;
  from: number;
  to: number;
}): Promise<TraderReferralStats> {
  const res = await graphqlFetcher<Pick<Query, "traderReferralStats">>(params.endpoint, TRADER_REFERRAL_STATS_QUERY, {
    where: {
      trader: params.trader,
      from: params.from,
      to: params.to,
    },
  });

  if (!res?.traderReferralStats) {
    throw new Error("Failed to fetch trader referral stats");
  }

  const summary = res.traderReferralStats.summary;

  return {
    trader: res.traderReferralStats.trader,
    from: res.traderReferralStats.from,
    to: res.traderReferralStats.to,
    compareFrom: res.traderReferralStats.compareFrom ?? undefined,
    compareTo: res.traderReferralStats.compareTo ?? undefined,
    hasComparison: res.traderReferralStats.hasComparison,
    bucketSizeSeconds: res.traderReferralStats.bucketSizeSeconds,
    summary: {
      volumeUsd: BigInt(summary.volumeUsd),
      volumeUsdDelta: toBigInt(summary.volumeUsdDelta),
      discountsUsd: BigInt(summary.discountsUsd),
      discountsUsdDelta: toBigInt(summary.discountsUsdDelta),
    },
    points: res.traderReferralStats.points.map((point) => ({
      timestamp: point.timestamp,
      volumeUsd: BigInt(point.volumeUsd),
      discountsUsd: BigInt(point.discountsUsd),
    })),
  };
}

export function useTraderReferralStats(params: { chainId: number; trader?: string; from: number; to: number }) {
  const endpoint = getIndexerUrl(params.chainId, "subsquid");
  const trader = params.trader?.toLowerCase();
  const key = trader && endpoint ? ["trader-referral-stats", endpoint, trader, params.from, params.to] : null;

  return useSWR<TraderReferralStats>(key, {
    fetcher: () =>
      fetchTraderReferralStats({
        endpoint: endpoint!,
        trader: trader!,
        from: params.from,
        to: params.to,
      }),
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    revalidateOnFocus: false,
  });
}
