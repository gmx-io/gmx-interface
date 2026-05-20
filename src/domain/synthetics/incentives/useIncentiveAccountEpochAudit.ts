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

export type IncentiveAuditOrderBy =
  | "fees_ASC"
  | "fees_DESC"
  | "points_ASC"
  | "points_DESC"
  | "rewards_ASC"
  | "rewards_DESC"
  | "volume_ASC"
  | "volume_DESC"
  | "epochTimestamp_ASC"
  | "epochTimestamp_DESC"
  | "effectivePointsRatio_ASC"
  | "effectivePointsRatio_DESC"
  | "effectiveRewardsRatio_ASC"
  | "effectiveRewardsRatio_DESC";

const AUDIT_QUERY = gql`
  query IncentiveAccountEpochAudit(
    $where: IncentiveAccountEpochAuditWhereInput
    $orderBy: IncentiveAccountEpochAuditOrderByInput
    $limit: Int
    $offset: Int
  ) {
    incentiveAccountEpochAudit(where: $where, orderBy: $orderBy, limit: $limit, offset: $offset) {
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

export type IncentiveAuditWhere = {
  epochTimestamp?: number;
  account?: string;
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
    where?: IncentiveAuditWhere;
    orderBy?: IncentiveAuditOrderBy;
    limit?: number;
    offset?: number;
    enabled?: boolean;
  }
) {
  const { where, orderBy, limit = 20, offset = 0, enabled = true } = params;

  // Lowercase the account up front so the cache key and the GraphQL `where`
  // variable both use a deterministic representation. The backend resolver
  // normalizes via viem's `getAddress`, but lowercasing here keeps SWR cache
  // keys stable regardless of input casing.
  const normalizedAccount = where?.account?.toLowerCase();
  const epochTimestamp = where?.epochTimestamp;

  const { data, error, isLoading } = useSWR<AuditResult | undefined>(
    enabled
      ? [
          "useIncentiveAccountEpochAudit",
          chainId,
          epochTimestamp ?? "all",
          normalizedAccount ?? "all",
          orderBy ?? "default",
          limit,
          offset,
        ]
      : null,
    {
      fetcher: async () => {
        const client = getSubsquidGraphClient(chainId);
        if (!client) return undefined;

        const whereVar: Record<string, unknown> = {};
        if (epochTimestamp !== undefined) whereVar.epochTimestamp = epochTimestamp;
        if (normalizedAccount !== undefined) whereVar.account = normalizedAccount;

        const variables: Record<string, unknown> = { limit, offset };
        if (Object.keys(whereVar).length > 0) variables.where = whereVar;
        if (orderBy !== undefined) variables.orderBy = orderBy;

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
