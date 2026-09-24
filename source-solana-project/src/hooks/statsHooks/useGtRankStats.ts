import { BN } from '@coral-xyz/anchor';
import { getGmw331Enabled } from '@/config/featureFlagEnable';
import { LEADERBOARD_MAX_DISPLAY_ITEMS } from './gtLeaderboardQuery';
import { useGtRankStatsLegacy } from './useGtRankStatsLegacy';
import { useGtRankStatsPaginated } from './useGtRankStatsPaginated';

export type { GtUserInfo } from './useGtRankStatsPaginated';

interface UseGtRankStatsOptions {
  page?: number;
  pageSize?: number;
  currentUserAddress?: string;
  currentUserRank?: number;
  currentUserGt?: BN | null;
  isUserRankLoading?: boolean;
}

export const useGtRankStats = (options: UseGtRankStatsOptions = {}) => {
  const isGmw331Enabled = getGmw331Enabled();
  const legacy = useGtRankStatsLegacy(!isGmw331Enabled);
  const paginated = useGtRankStatsPaginated({
    enabled: isGmw331Enabled,
    page: options.page ?? 1,
    pageSize: options.pageSize ?? 20,
    currentUserAddress: options.currentUserAddress,
    currentUserRank: options.currentUserRank,
    currentUserGt: options.currentUserGt,
    isUserRankLoading: options.isUserRankLoading,
  });

  if (isGmw331Enabled) {
    return paginated;
  }

  return {
    gtRankStats: legacy.gtRankStats,
    totalCount: LEADERBOARD_MAX_DISPLAY_ITEMS,
    pageCount: 1,
    isLoading: legacy.isLoading,
  };
};
