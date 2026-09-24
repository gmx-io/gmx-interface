import { BN } from '@coral-xyz/anchor';
import useSWR from 'swr';
import {
  fetchLeaderboardPage,
  GtUserInfo,
  LEADERBOARD_MAX_DISPLAY_ITEMS,
} from './gtLeaderboardQuery';

const GT_RANK_STATS_KEY = 'data_store/gt_rank_stats';

interface UseGtRankStatsPaginatedOptions {
  enabled?: boolean;
  page: number;
  pageSize: number;
  currentUserAddress?: string;
  currentUserRank?: number;
  currentUserGt?: BN | null;
  isUserRankLoading?: boolean;
}

export type { GtUserInfo };

export const useGtRankStatsPaginated = ({
  enabled = true,
  page,
  pageSize,
  currentUserAddress,
  currentUserRank = 0,
  currentUserGt,
  isUserRankLoading = false,
}: UseGtRankStatsPaginatedOptions) => {
  const pinCurrentUser = Boolean(
    currentUserAddress && currentUserRank > 0 && currentUserGt && !currentUserGt.isZero()
  );

  const shouldWaitForUserRank = Boolean(currentUserAddress);
  const isRankReady = !shouldWaitForUserRank || !isUserRankLoading;

  const { data, isLoading } = useSWR(
    enabled && isRankReady
      ? [
          GT_RANK_STATS_KEY,
          page,
          pageSize,
          pinCurrentUser ? currentUserAddress : '',
          pinCurrentUser ? currentUserRank : 0,
          'paginated',
        ]
      : null,
    () =>
      fetchLeaderboardPage(page, pageSize, {
        pinCurrentUser,
        currentUserAddress,
        currentUserRank,
        currentUserGt: currentUserGt ?? undefined,
      }),
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const pageCount = Math.max(
    1,
    Math.ceil(LEADERBOARD_MAX_DISPLAY_ITEMS / pageSize)
  );

  return {
    gtRankStats: {
      userRanks: data ?? [],
    },
    totalCount: LEADERBOARD_MAX_DISPLAY_ITEMS,
    pageCount,
    isLoading,
  };
};
