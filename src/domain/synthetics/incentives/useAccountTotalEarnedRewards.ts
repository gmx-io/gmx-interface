import { useMemo } from "react";

import { useIncentivesLeaderboard } from "./useIncentivesLeaderboard";

export function useAccountTotalEarnedRewards(chainId: number, params: { account?: string; enabled?: boolean }) {
  const { account, enabled = true } = params;

  const { data, error, loading } = useIncentivesLeaderboard(chainId, {
    where: account ? { account } : undefined,
    enabled: enabled && Boolean(account),
    limit: 1,
    offset: 0,
  });

  return useMemo(
    () => ({
      data: data ? data[0]?.rewardsEarned ?? 0n : undefined,
      error,
      loading,
    }),
    [data, error, loading]
  );
}
