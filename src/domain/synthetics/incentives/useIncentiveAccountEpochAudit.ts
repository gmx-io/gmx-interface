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
  pointRecordsCount: number;
  rewardRecordsCount: number;
  lastReceivedAt: number;
};

export type AuditSummary = {
  loadedCount: number;
  avgPointsRatio: number;
  avgRewardsRatio: number;
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
      pointRecordsCount
      rewardRecordsCount
      lastReceivedAt
    }
  }
`;

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

  const { data, error, isLoading } = useSWR<AuditEntry[] | undefined>(
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

        const entries = res?.data?.incentiveAccountEpochAudit;
        if (!entries) return undefined;

        return entries.map(
          (e: {
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
            pointRecordsCount: number;
            rewardRecordsCount: number;
            lastReceivedAt: number;
          }): AuditEntry => ({
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
            pointRecordsCount: e.pointRecordsCount,
            rewardRecordsCount: e.rewardRecordsCount,
            lastReceivedAt: e.lastReceivedAt,
          })
        );
      },
      refreshInterval: 5 * 60_000,
      revalidateOnFocus: false,
    }
  );

  const summary = useMemo<AuditSummary | undefined>(() => {
    if (!data || data.length === 0) return undefined;

    const loadedCount = data.length;
    const avgPointsRatio = data.reduce((sum, e) => sum + e.effectivePointsRatio, 0) / loadedCount;
    const avgRewardsRatio = data.reduce((sum, e) => sum + e.effectiveRewardsRatio, 0) / loadedCount;
    const totalRewards = data.reduce((sum, e) => sum + e.rewards, 0n);

    return { loadedCount, avgPointsRatio, avgRewardsRatio, totalRewards };
  }, [data]);

  return useMemo(() => ({ data, summary, error, loading: isLoading }), [data, summary, error, isLoading]);
}
