import { useMemo } from "react";
import useSWR from "swr";
import { isAddress } from "viem";

import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { fetchIncentivesGraphql, getIncentivesIndexerUrl } from "./client";
import { parseIncentivesLeaderboardPage, type RawLeaderboardEntry } from "./parsers";
import { INCENTIVES_LEADERBOARD_QUERY } from "./queries";
import type { IncentivesLeaderboardPage } from "./types";

const MAX_PAGE_SIZE = 1000;
const COMPLETED_LEADERBOARD_REFRESH_INTERVAL = 5 * CONFIG_UPDATE_INTERVAL;

export type IncentivesLeaderboardOrderBy =
  | "tradingVolume_ASC"
  | "tradingVolume_DESC"
  | "referralVolume_ASC"
  | "referralVolume_DESC"
  | "esGmxRewards_ASC"
  | "esGmxRewards_DESC"
  | "gtRewards_ASC"
  | "gtRewards_DESC"
  | "rewardsUsd_ASC"
  | "rewardsUsd_DESC"
  | "multiplier_ASC"
  | "multiplier_DESC";

export function useIncentivesLeaderboard(
  chainId: number,
  params: {
    epoch?: number;
    where?: { account?: string };
    orderBy?: IncentivesLeaderboardOrderBy;
    enabled?: boolean;
    isMutable?: boolean;
    limit: number;
    offset: number;
  }
) {
  const { epoch, where, orderBy, enabled = true, isMutable = false } = params;
  const endpoint = getIncentivesIndexerUrl(chainId);
  const account = where?.account && isAddress(where.account) ? where.account : undefined;
  const hasInvalidAccount = Boolean(where?.account && !account);
  const limit = Math.min(Math.max(Math.trunc(params.limit), 1), MAX_PAGE_SIZE);
  const offset = Math.max(Math.trunc(params.offset), 0);
  const swrKey =
    enabled && endpoint && !hasInvalidAccount
      ? ["useIncentivesV2Leaderboard", chainId, endpoint, epoch ?? "all", account ?? "all", orderBy, limit, offset]
      : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<IncentivesLeaderboardPage>(swrKey, {
    fetcher: async () => {
      const variables: Record<string, unknown> = { limit, offset };
      if (epoch !== undefined) variables.epoch = epoch;
      if (account !== undefined) variables.where = { account };
      if (orderBy !== undefined) variables.orderBy = orderBy;

      const response = await fetchIncentivesGraphql<{
        incentivesLeaderboard: { totalCount: number; items: RawLeaderboardEntry[] };
      }>(endpoint!, INCENTIVES_LEADERBOARD_QUERY, variables);

      return parseIncentivesLeaderboardPage(response.incentivesLeaderboard, limit, offset);
    },
    refreshInterval: isMutable ? CONFIG_UPDATE_INTERVAL : COMPLETED_LEADERBOARD_REFRESH_INTERVAL,
    revalidateOnFocus: false,
  });

  return useMemo(
    () => ({
      data: data?.entries,
      totalCount: data?.totalCount,
      hasNextPage: data?.hasNextPage ?? false,
      error,
      loading: isLoading,
      isValidating,
      mutate,
      endpoint,
    }),
    [data, endpoint, error, isLoading, isValidating, mutate]
  );
}
