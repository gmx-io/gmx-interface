import { useMemo } from "react";
import useSWR from "swr";
import { isAddress } from "viem";

import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { fetchIncentivesGraphql, getIncentivesIndexerUrl } from "./client";
import { parseIncentiveAccountEpochAuditPage, type RawIncentiveAccountEpochAuditEntry } from "./parsers";
import { INCENTIVE_ACCOUNT_EPOCH_AUDIT_QUERY } from "./queries";
import type { IncentiveAccountEpochAuditPage } from "./types";

const MAX_PAGE_SIZE = 1000;
const AUDIT_REFRESH_INTERVAL = 5 * CONFIG_UPDATE_INTERVAL;

export type IncentiveAuditOrderBy =
  | "fees_ASC"
  | "fees_DESC"
  | "tradingVolume_ASC"
  | "tradingVolume_DESC"
  | "referralVolume_ASC"
  | "referralVolume_DESC"
  | "rewardsUsd_ASC"
  | "rewardsUsd_DESC"
  | "epochTimestamp_ASC"
  | "epochTimestamp_DESC"
  | "effectiveRewardsRatio_ASC"
  | "effectiveRewardsRatio_DESC";

export type IncentiveAuditWhere = {
  account?: string;
  epochTimestamp?: number;
};

export type IncentiveAuditSummary = {
  loadedCount: number;
  totalFees: bigint;
  totalTradingVolume: bigint;
  totalTierVolume: bigint;
  totalReferralVolume: bigint;
  totalEsGmxRewards: bigint;
  totalGtRewards: bigint;
  totalRewardsUsd: bigint;
  totalManualRewardsUsd: bigint;
  avgEffectiveRewardsRatio: number;
};

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
  const { where, orderBy, enabled = true } = params;
  const endpoint = getIncentivesIndexerUrl(chainId);
  const validAccount = where?.account && isAddress(where.account) ? where.account : undefined;
  const hasInvalidAccount = Boolean(where?.account && !validAccount);
  const epochTimestamp = where?.epochTimestamp;
  const limit = Math.min(Math.max(Math.trunc(params.limit ?? 20), 1), MAX_PAGE_SIZE);
  const offset = Math.max(Math.trunc(params.offset ?? 0), 0);
  const swrKey =
    enabled && endpoint && !hasInvalidAccount
      ? [
          "useIncentiveAccountEpochV2Audit",
          chainId,
          endpoint,
          epochTimestamp ?? "all",
          validAccount ?? "all",
          orderBy,
          limit,
          offset,
        ]
      : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<IncentiveAccountEpochAuditPage>(swrKey, {
    fetcher: async () => {
      const whereVariable: IncentiveAuditWhere = {};
      if (validAccount !== undefined) whereVariable.account = validAccount;
      if (epochTimestamp !== undefined) whereVariable.epochTimestamp = epochTimestamp;

      const variables: Record<string, unknown> = { limit, offset };
      if (Object.keys(whereVariable).length > 0) variables.where = whereVariable;
      if (orderBy !== undefined) variables.orderBy = orderBy;

      const response = await fetchIncentivesGraphql<{
        incentiveAccountEpochAudit: { totalCount: number; items: RawIncentiveAccountEpochAuditEntry[] };
      }>(endpoint!, INCENTIVE_ACCOUNT_EPOCH_AUDIT_QUERY, variables);

      return parseIncentiveAccountEpochAuditPage(response.incentiveAccountEpochAudit, limit, offset);
    },
    refreshInterval: AUDIT_REFRESH_INTERVAL,
    revalidateOnFocus: false,
  });

  const summary = useMemo<IncentiveAuditSummary | undefined>(() => {
    if (!data?.entries.length) return undefined;

    const totals = data.entries.reduce(
      (result, entry) => ({
        totalFees: result.totalFees + entry.fees,
        totalTradingVolume: result.totalTradingVolume + entry.tradingVolume,
        totalTierVolume: result.totalTierVolume + entry.tierVolume,
        totalReferralVolume: result.totalReferralVolume + entry.referralVolume,
        totalEsGmxRewards: result.totalEsGmxRewards + entry.esGmxRewards,
        totalGtRewards: result.totalGtRewards + entry.gtRewards,
        totalRewardsUsd: result.totalRewardsUsd + entry.rewardsUsd,
        totalManualRewardsUsd: result.totalManualRewardsUsd + entry.manualRewardsUsd,
        effectiveRewardsRatioSum: result.effectiveRewardsRatioSum + entry.effectiveRewardsRatio,
      }),
      {
        totalFees: 0n,
        totalTradingVolume: 0n,
        totalTierVolume: 0n,
        totalReferralVolume: 0n,
        totalEsGmxRewards: 0n,
        totalGtRewards: 0n,
        totalRewardsUsd: 0n,
        totalManualRewardsUsd: 0n,
        effectiveRewardsRatioSum: 0,
      }
    );

    return {
      loadedCount: data.entries.length,
      totalFees: totals.totalFees,
      totalTradingVolume: totals.totalTradingVolume,
      totalTierVolume: totals.totalTierVolume,
      totalReferralVolume: totals.totalReferralVolume,
      totalEsGmxRewards: totals.totalEsGmxRewards,
      totalGtRewards: totals.totalGtRewards,
      totalRewardsUsd: totals.totalRewardsUsd,
      totalManualRewardsUsd: totals.totalManualRewardsUsd,
      avgEffectiveRewardsRatio: totals.effectiveRewardsRatioSum / data.entries.length,
    };
  }, [data]);

  return useMemo(
    () => ({
      data: data?.entries,
      totalCount: data?.totalCount,
      hasNextPage: data?.hasNextPage ?? false,
      summary,
      error,
      loading: isLoading,
      isValidating,
      mutate,
      endpoint,
    }),
    [data, endpoint, error, isLoading, isValidating, mutate, summary]
  );
}
