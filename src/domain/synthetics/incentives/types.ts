export type VolumeTierId = "Tier1" | "Tier2" | "Tier3" | "Tier4" | "Tier5";
export type StakingTierId = "Tier1" | "Tier2" | "Tier3" | "Tier4" | "Tier5";
export type BoostId = "FeaturedMarkets" | "BalancingTrades" | "LifetimeTrading";

export type VolumeTierConfig = {
  tier: VolumeTierId;
  threshold: bigint;
  multiplier: number;
};

export type StakingTierConfig = {
  tier: StakingTierId;
  threshold: bigint;
  multiplier: number;
};

export type BoostConfig = {
  boost: BoostId;
  multiplier: number;
};

export type IncentivesConfig = {
  programStartTimestamp: number;
  epochTimestamp: number;
  epochStartTimestamp: number;
  epochDuration: number;
  maxMultiplier: number;
  multiplierDecimals: number;
  volumeTierPersistenceEpochs: number;
  pointsExpirationEpochs: number;
  basePointsFactor: bigint;
  pointsToGmxFactor: bigint;
  volumeTiers: VolumeTierConfig[];
  stakingTiers: StakingTierConfig[];
  boosts: BoostConfig[];
  balancingTradesThreshold: bigint;
  lifetimeVolumeThreshold: bigint;
  downgradingCoefficients: Record<string, bigint>;
  featuredMarketTokens: string[];
};

export type AccountIncentiveStatus = {
  account: string;
  pointsBalance: bigint;
  multiplier: number;
  volumeTier: VolumeTierId | null;
  stakingTier: StakingTierId | null;
  projectedVolumeTier: VolumeTierId | null;
  projectedStakingTier: StakingTierId | null;
  epochTimestamp: number;
  tradedVolume: bigint;
  boostIds: BoostId[];
};

export type EpochStats = {
  account: string;
  multiplier: number;
  epochTimestamp: number;
  volumeTier: VolumeTierId | null;
  stakingTier: StakingTierId | null;
  tradedVolume: bigint;
  boostIds: BoostId[];
};

export type RewardsHistoryEntry = {
  epoch: number;
  volume: bigint;
  pointsEarned: bigint;
  pointsSpent: bigint;
  pointsExpired: bigint;
  pointsBalance: bigint;
  rewardsEarned: bigint;
  rewardsClaimed: bigint;
};

export type LeaderboardEntry = {
  rank: number;
  address: string;
  volume: bigint;
  pointsEarned: bigint;
  rewardsEarned: bigint;
  multiplier?: number;
};
