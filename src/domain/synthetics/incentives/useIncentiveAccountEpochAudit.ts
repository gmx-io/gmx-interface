import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

import type { BoostId, StakingTierId, VolumeTierId } from "./types";

export type AuditEntry = {
  id: string;
  account: string;
  epochTimestamp: number;
  points: bigint;
  rewards: bigint;
  fees: bigint;
  volume: bigint;
  avgMultiplier: number;
  maxMultiplier: number;
  volumeTier: VolumeTierId | null;
  stakingTier: StakingTierId | null;
  boostIds: BoostId[];
  effectivePointsRatio: number;
  effectiveRewardsRatio: number;
  lastReceivedAt: number;
};

export type AuditSummary = {
  loadedCount: number;
  avgPointsRatio: number;
  avgRewardsRatio: number;
  totalPoints: bigint;
  totalRewards: bigint;
};

const AUDIT_QUERY = gql`
  query IncentiveAccountEpochAudit(
    $epochTimestamp: Int
    $account: String
    $orderBy: String
    $orderDirection: String
    $limit: Int
    $offset: Int
  ) {
    incentiveAccountEpochAudit(
      epochTimestamp: $epochTimestamp
      account: $account
      orderBy: $orderBy
      orderDirection: $orderDirection
      limit: $limit
      offset: $offset
    ) {
      totalCount
      items {
        id
        account
        epochTimestamp
        points
        rewards
        fees
        volume
        avgMultiplier
        maxMultiplier
        volumeTier
        stakingTier
        boostIds
        effectivePointsRatio
        effectiveRewardsRatio
        lastReceivedAt
      }
    }
  }
`;

type RawAuditEntry = {
  id: string;
  account: string;
  epochTimestamp: number;
  points: string;
  rewards: string;
  fees: string;
  volume: string;
  avgMultiplier: number;
  maxMultiplier: number;
  volumeTier: string | null;
  stakingTier: string | null;
  boostIds: string[];
  effectivePointsRatio: number;
  effectiveRewardsRatio: number;
  lastReceivedAt: number;
};

type AuditResult = {
  entries: AuditEntry[];
  totalCount: number;
};

function parseAuditEntry(e: RawAuditEntry): AuditEntry {
  return {
    id: e.id,
    account: e.account,
    epochTimestamp: e.epochTimestamp,
    points: BigInt(e.points),
    rewards: BigInt(e.rewards),
    fees: BigInt(e.fees),
    volume: BigInt(e.volume),
    avgMultiplier: e.avgMultiplier,
    maxMultiplier: e.maxMultiplier,
    volumeTier: (e.volumeTier as VolumeTierId) ?? null,
    stakingTier: (e.stakingTier as StakingTierId) ?? null,
    boostIds: (e.boostIds as BoostId[]) ?? [],
    effectivePointsRatio: e.effectivePointsRatio,
    effectiveRewardsRatio: e.effectiveRewardsRatio,
    lastReceivedAt: e.lastReceivedAt,
  };
}

export function useIncentiveAccountEpochAudit(
  chainId: number,
  params: {
    epochTimestamp?: number;
    account?: string;
    orderBy?: string;
    orderDirection?: string;
    limit?: number;
    offset?: number;
    enabled?: boolean;
  }
) {
  const { epochTimestamp, account, orderBy, orderDirection, limit = 20, offset = 0, enabled = true } = params;

  const { data, error, isLoading } = useSWR<AuditResult | undefined>(
    enabled
      ? [
          "useIncentiveAccountEpochAudit",
          chainId,
          epochTimestamp ?? "all",
          account ?? "all",
          orderBy,
          orderDirection,
          limit,
          offset,
        ]
      : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client) return undefined;

        const variables: Record<string, unknown> = { orderBy, orderDirection, limit, offset };
        if (epochTimestamp !== undefined) variables.epochTimestamp = epochTimestamp;
        if (account !== undefined) variables.account = account.toLowerCase();

        const res = await client.query({
          query: AUDIT_QUERY,
          variables,
          fetchPolicy: "no-cache",
        });

        const audit = res?.data?.incentiveAccountEpochAudit;
        if (!audit) return undefined;

        return {
          entries: audit.items.map(parseAuditEntry),
          totalCount: audit.totalCount,
        };
      },
      refreshInterval: 5 * 60_000,
      revalidateOnFocus: false,
    }
  );

  const summary = useMemo<AuditSummary | undefined>(() => {
    if (!data || data.entries.length === 0) return undefined;

    const loadedCount = data.entries.length;
    const avgPointsRatio = data.entries.reduce((sum, e) => sum + e.effectivePointsRatio, 0) / loadedCount;
    const avgRewardsRatio = data.entries.reduce((sum, e) => sum + e.effectiveRewardsRatio, 0) / loadedCount;
    const totalPoints = data.entries.reduce((sum, e) => sum + e.points, 0n);
    const totalRewards = data.entries.reduce((sum, e) => sum + e.rewards, 0n);

    return { loadedCount, avgPointsRatio, avgRewardsRatio, totalPoints, totalRewards };
  }, [data]);

  return useMemo(
    () => ({ data: data?.entries, totalCount: data?.totalCount, summary, error, loading: isLoading }),
    [data, summary, error, isLoading]
  );
}
