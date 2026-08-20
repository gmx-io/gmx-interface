import { useMemo } from "react";
import useSWR from "swr";

import { fetchIncentivesGraphql } from "./client";
import { parseIncentivesLeaderboardPage, type RawLeaderboardEntry } from "./parsers";
import { INCENTIVES_LEADERBOARD_QUERY } from "./queries";
import type { LeaderboardEntry } from "./types";
import { useIncentivesIndexerUrl } from "./useIncentivesIndexerUrl";
import type { IncentivesLeaderboardOrderBy } from "./useIncentivesLeaderboard";

// The leaderboard query filters by whole addresses only, so partial search scans the ranked
// list and matches client side. The scan is capped to keep it bounded as the list grows.
const SEARCH_PAGE_SIZE = 1000;
const MAX_SEARCH_PAGES = 10;
const SEARCH_ORDER_BY: IncentivesLeaderboardOrderBy = "rewardsUsd_DESC";

export const LEADERBOARD_SEARCH_SCAN_LIMIT = SEARCH_PAGE_SIZE * MAX_SEARCH_PAGES;

const SEARCH_SORT_VALUES: Record<string, (entry: LeaderboardEntry) => bigint> = {
  tradingVolume: (entry) => entry.tradingVolume,
  referralVolume: (entry) => entry.referralVolume,
  esGmxRewards: (entry) => entry.esGmxRewards,
  gtRewards: (entry) => entry.gtRewards,
  rewardsUsd: (entry) => entry.rewardsUsd,
  multiplier: (entry) => entry.multiplier ?? 0n,
};

type LeaderboardScan = {
  entries: LeaderboardEntry[];
  totalCount: number;
};

function sortMatchedEntries(entries: LeaderboardEntry[], orderBy: IncentivesLeaderboardOrderBy) {
  const getValue = SEARCH_SORT_VALUES[orderBy.slice(0, orderBy.lastIndexOf("_"))];
  if (!getValue) return entries;

  const directionSign = orderBy.endsWith("_ASC") ? 1 : -1;

  return [...entries].sort((first, second) => {
    const firstValue = getValue(first);
    const secondValue = getValue(second);

    if (firstValue === secondValue) return first.rank - second.rank;

    return (firstValue > secondValue ? 1 : -1) * directionSign;
  });
}

export function useIncentivesLeaderboardSearch(
  chainId: number,
  params: {
    epoch?: number;
    term: string;
    orderBy: IncentivesLeaderboardOrderBy;
    enabled?: boolean;
    limit: number;
    offset: number;
  }
) {
  const { epoch, term, orderBy, enabled = true } = params;
  const endpoint = useIncentivesIndexerUrl(chainId);
  const limit = Math.max(Math.trunc(params.limit), 1);
  const offset = Math.max(Math.trunc(params.offset), 0);
  const swrKey = enabled && endpoint ? ["useIncentivesV2LeaderboardSearch", chainId, endpoint, epoch ?? "all"] : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<LeaderboardScan>(swrKey, {
    fetcher: async () => {
      const fetchPage = async (pageOffset: number) => {
        const variables: Record<string, unknown> = {
          limit: SEARCH_PAGE_SIZE,
          offset: pageOffset,
          orderBy: SEARCH_ORDER_BY,
        };
        if (epoch !== undefined) variables.epoch = epoch;

        const response = await fetchIncentivesGraphql<{
          incentivesLeaderboard: { totalCount: number; items: RawLeaderboardEntry[] };
        }>(endpoint!, INCENTIVES_LEADERBOARD_QUERY, variables);

        return parseIncentivesLeaderboardPage(response.incentivesLeaderboard, SEARCH_PAGE_SIZE, pageOffset);
      };

      const firstPage = await fetchPage(0);
      const scannedCount = Math.min(firstPage.totalCount, SEARCH_PAGE_SIZE * MAX_SEARCH_PAGES);
      const restOffsets: number[] = [];
      for (let pageOffset = SEARCH_PAGE_SIZE; pageOffset < scannedCount; pageOffset += SEARCH_PAGE_SIZE) {
        restOffsets.push(pageOffset);
      }

      const restPages = await Promise.all(restOffsets.map(fetchPage));

      return {
        entries: firstPage.entries.concat(...restPages.map((page) => page.entries)),
        totalCount: firstPage.totalCount,
      };
    },
    // The scan is too heavy to poll; it is revalidated on epoch rollover and when a search remounts.
    refreshInterval: 0,
    revalidateOnFocus: false,
  });

  const matchedEntries = useMemo(() => {
    if (data === undefined) return undefined;

    const needle = term.trim().toLowerCase();
    if (!needle) return [];

    return sortMatchedEntries(
      data.entries.filter((entry) => entry.address.toLowerCase().includes(needle)),
      orderBy
    );
  }, [data, orderBy, term]);

  return useMemo(
    () => ({
      data: matchedEntries?.slice(offset, offset + limit),
      totalCount: matchedEntries?.length,
      isTruncated: data !== undefined && data.entries.length < data.totalCount,
      error,
      loading: isLoading,
      isValidating,
      mutate,
    }),
    [data, error, isLoading, isValidating, limit, matchedEntries, mutate, offset]
  );
}
