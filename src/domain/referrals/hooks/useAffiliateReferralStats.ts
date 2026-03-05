import useSWR from "swr";

import { getIndexerUrl } from "config/indexers";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { Query } from "sdk/codegen/subsquid";
import graphqlFetcher from "sdk/utils/graphqlFetcher";
import { toBigInt } from "sdk/utils/numbers";

export type AffiliateReferralStats = {
  affiliate: string;
  from: number;
  to: number;
  compareFrom?: number;
  compareTo?: number;
  hasComparison: boolean;
  bucketSizeSeconds: number;
  summary: {
    volumeUsd: bigint;
    volumeUsdDelta?: bigint;
    tradesCount: number;
    tradesCountDelta?: number;
    rebatesUsd: bigint;
    rebatesUsdDelta?: bigint;
    tradersCount: number;
    tradersCountDelta?: number;
    tradersGained?: number;
    tradersGainedDelta?: number;
    tradersLost?: number;
    tradersLostDelta?: number;
    tradersNet?: number;
    tradersNetDelta?: number;
  };
  points: {
    timestamp: number;
    volumeUsd: bigint;
    tradesCount: number;
    rebatesUsd: bigint;
    tradersGained: number;
    tradersLost: number;
    tradersNet: number;
  }[];
};

const REFERRAL_STATS_QUERY = /* GraphQL */ `
  query ReferralStats($where: ReferralStatsWhereInput) {
    referralStats(where: $where) {
      affiliate
      from
      to
      compareFrom
      compareTo
      hasComparison
      bucketSizeSeconds
      summary {
        volumeUsd
        volumeUsdDelta
        tradesCount
        tradesCountDelta
        rebatesUsd
        rebatesUsdDelta
        tradersCount
        tradersCountDelta
        tradersGained
        tradersGainedDelta
        tradersLost
        tradersLostDelta
        tradersNet
        tradersNetDelta
      }
      points {
        timestamp
        volumeUsd
        tradesCount
        rebatesUsd
        tradersGained
        tradersLost
        tradersNet
      }
    }
  }
`;

async function fetchAffiliateReferralStats(params: {
  endpoint: string;
  affiliate: string;
  from: number;
  to: number;
}): Promise<AffiliateReferralStats> {
  const res = await graphqlFetcher<Pick<Query, "referralStats">>(params.endpoint, REFERRAL_STATS_QUERY, {
    where: {
      affiliate: params.affiliate,
      from: params.from,
      to: params.to,
    },
  });

  if (!res?.referralStats) {
    throw new Error("Failed to fetch referral stats");
  }

  const summary = res.referralStats.summary;

  return {
    affiliate: res.referralStats.affiliate,
    from: res.referralStats.from,
    to: res.referralStats.to,
    compareFrom: res.referralStats.compareFrom ?? undefined,
    compareTo: res.referralStats.compareTo ?? undefined,
    hasComparison: res.referralStats.hasComparison,
    bucketSizeSeconds: res.referralStats.bucketSizeSeconds,
    summary: {
      volumeUsd: BigInt(summary.volumeUsd),
      volumeUsdDelta: toBigInt(summary.volumeUsdDelta),
      tradesCount: summary.tradesCount,
      tradesCountDelta: summary.tradesCountDelta ?? undefined,
      rebatesUsd: BigInt(summary.rebatesUsd),
      rebatesUsdDelta: toBigInt(summary.rebatesUsdDelta),
      tradersCount: summary.tradersCount,
      tradersCountDelta: summary.tradersCountDelta ?? undefined,
      tradersGained: summary.tradersGained ?? undefined,
      tradersGainedDelta: summary.tradersGainedDelta ?? undefined,
      tradersLost: summary.tradersLost ?? undefined,
      tradersLostDelta: summary.tradersLostDelta ?? undefined,
      tradersNet: summary.tradersNet ?? undefined,
      tradersNetDelta: summary.tradersNetDelta ?? undefined,
    },
    points: res.referralStats.points.map((point) => ({
      timestamp: point.timestamp,
      volumeUsd: BigInt(point.volumeUsd),
      tradesCount: point.tradesCount,
      rebatesUsd: BigInt(point.rebatesUsd),
      tradersGained: point.tradersGained,
      tradersLost: point.tradersLost,
      tradersNet: point.tradersNet,
    })),
  };
}

export function useAffiliateReferralStats(params: { chainId: number; affiliate?: string; from: number; to: number }) {
  const endpoint = getIndexerUrl(params.chainId, "subsquid");
  const affiliate = params.affiliate?.toLowerCase();
  const key = affiliate && endpoint ? ["affiliate-referral-stats", endpoint, affiliate, params.from, params.to] : null;

  return useSWR<AffiliateReferralStats>(key, {
    fetcher: () =>
      fetchAffiliateReferralStats({
        endpoint: endpoint!,
        affiliate: affiliate!,
        from: params.from,
        to: params.to,
      }),
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    revalidateOnFocus: false,
  });
}
