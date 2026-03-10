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

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  return toNumber(value);
}

const AFFILIATE_STATS_QUERY = /* GraphQL */ `
  query AffiliateStats($where: AffiliateStatsWhereInput) {
    affiliateStats(where: $where) {
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
  const res = await graphqlFetcher<Pick<Query, "affiliateStats">>(params.endpoint, AFFILIATE_STATS_QUERY, {
    where: {
      affiliate: params.affiliate,
      from: params.from,
      to: params.to,
    },
  });

  if (!res?.affiliateStats) {
    throw new Error("Failed to fetch affiliate stats");
  }

  const summary = res.affiliateStats.summary;

  return {
    affiliate: res.affiliateStats.affiliate,
    from: res.affiliateStats.from,
    to: res.affiliateStats.to,
    compareFrom: res.affiliateStats.compareFrom ?? undefined,
    compareTo: res.affiliateStats.compareTo ?? undefined,
    hasComparison: res.affiliateStats.hasComparison,
    bucketSizeSeconds: res.affiliateStats.bucketSizeSeconds,
    summary: {
      volumeUsd: toBigInt(summary.volumeUsd) ?? 0n,
      volumeUsdDelta: toBigInt(summary.volumeUsdDelta),
      tradesCount: toNumber(summary.tradesCount),
      tradesCountDelta: toOptionalNumber(summary.tradesCountDelta),
      rebatesUsd: toBigInt(summary.rebatesUsd) ?? 0n,
      rebatesUsdDelta: toBigInt(summary.rebatesUsdDelta),
      tradersGained: toOptionalNumber(summary.tradersGained),
      tradersGainedDelta: toOptionalNumber(summary.tradersGainedDelta),
      tradersLost: toOptionalNumber(summary.tradersLost),
      tradersLostDelta: toOptionalNumber(summary.tradersLostDelta),
      tradersNet: toOptionalNumber(summary.tradersNet),
      tradersNetDelta: toOptionalNumber(summary.tradersNetDelta),
    },
    points: res.affiliateStats.points.map((point) => ({
      timestamp: point.timestamp,
      volumeUsd: toBigInt(point.volumeUsd) ?? 0n,
      tradesCount: toNumber(point.tradesCount),
      rebatesUsd: toBigInt(point.rebatesUsd) ?? 0n,
      tradersGained: toNumber(point.tradersGained),
      tradersLost: toNumber(point.tradersLost),
      tradersNet: toNumber(point.tradersNet),
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
