import type { AccountIncentiveStatus, EpochStats, IncentivesConfig } from "domain/synthetics/incentives/types";

type CurrentEpochConfig = Pick<IncentivesConfig, "epochTimestamp">;

type GetCurrentEpochStatsParams = {
  status?: AccountIncentiveStatus;
  config?: CurrentEpochConfig;
  account?: string;
};

export function getCurrentEpochStats({ status, config, account }: GetCurrentEpochStatsParams): EpochStats | undefined {
  if (status) {
    return {
      account: status.account,
      multiplier: status.multiplier,
      epochTimestamp: status.epochTimestamp,
      volumeTier: status.volumeTier,
      stakingTier: status.stakingTier,
      tradedVolume: status.tradedVolume,
      boostIds: status.boostIds,
    };
  }

  if (!config || !account) {
    return undefined;
  }

  return {
    account,
    multiplier: 0,
    epochTimestamp: config.epochTimestamp,
    volumeTier: null,
    stakingTier: null,
    tradedVolume: 0n,
    boostIds: [],
  };
}
