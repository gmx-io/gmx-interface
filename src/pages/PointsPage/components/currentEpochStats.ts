import type { AccountIncentiveDashboard, EpochStats, IncentivesConfig } from "domain/synthetics/incentives/types";

type CurrentEpochConfig = Pick<IncentivesConfig, "epochTimestamp">;

type GetCurrentEpochStatsParams = {
  dashboard?: AccountIncentiveDashboard;
  config?: CurrentEpochConfig;
  account?: string;
};

export function getCurrentEpochStats({ dashboard, config, account }: GetCurrentEpochStatsParams): EpochStats | undefined {
  if (!config) {
    if (!dashboard?.recentStats?.length) return undefined;

    return dashboard.recentStats.reduce((latest, stat) =>
      stat.epochTimestamp > latest.epochTimestamp ? stat : latest
    );
  }

  const currentEpochStats = dashboard?.recentStats.find((stat) => stat.epochTimestamp === config.epochTimestamp);

  if (currentEpochStats) {
    return currentEpochStats;
  }

  const statsAccount = dashboard?.account ?? account;

  if (!statsAccount) {
    return undefined;
  }

  return {
    account: statsAccount,
    multiplier: 0,
    epochTimestamp: config.epochTimestamp,
    volumeTier: null,
    stakingTier: null,
    tradedVolume: 0n,
    boostIds: [],
  };
}
