import { useIncentivesLeaderboard, type IncentivesLeaderboardOrderBy } from "./useIncentivesLeaderboard";

export function useIncentivesLeaderboardSearch(
  chainId: number,
  params: {
    epoch?: number;
    term: string;
    orderBy: IncentivesLeaderboardOrderBy;
    enabled?: boolean;
    isMutable?: boolean;
    limit: number;
    offset: number;
  }
) {
  const { term, enabled = true, ...leaderboardParams } = params;
  const accountContains = term.trim();

  return useIncentivesLeaderboard(chainId, {
    ...leaderboardParams,
    where: { account_contains: accountContains },
    enabled: enabled && accountContains.length > 0,
  });
}
