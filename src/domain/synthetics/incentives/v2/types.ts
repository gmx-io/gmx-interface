export type VolumeTierId = "Tier1" | "Tier2" | "Tier3" | "Tier4" | "Tier5";
export type StakingTierId = "Tier1" | "Tier2" | "Tier3" | "Tier4" | "Tier5";
export type BoostId = "FeaturedMarkets" | "BalancingTrades" | "LifetimeTrading" | "ManualAllocation";

export type VolumeTierConfig = {
  tier: VolumeTierId;
  threshold: bigint;
  multiplier: bigint;
};

export type StakingTierConfig = {
  tier: StakingTierId;
  threshold: bigint;
  multiplier: bigint;
};

export type BoostConfig = {
  boost: BoostId;
  multiplier: bigint;
};

export type DowngradingCoefficient = {
  market: string;
  coefficient: bigint;
};

export type ManualAllocationTierConfig = {
  minVolume: bigint;
  maxVolume: bigint | null;
  rewardCapUsd: bigint;
};

export type IncentivesConfig = {
  epochTimestamp: number;
  epochStartTimestamp: number;
  programStartTimestamp: number;
  epochDuration: number;
  maxMultiplier: bigint;
  multiplierDecimals: bigint;
  volumeTierPersistenceEpochs: number;
  feeShareFactor: bigint;
  esGmxShareFactor: bigint;
  gtShareFactor: bigint;
  referralRewardShareFactor: bigint;
  volumeTiers: VolumeTierConfig[];
  stakingTiers: StakingTierConfig[];
  boosts: BoostConfig[];
  featuredMarketIndexTokens: string[];
  downgradingCoefficients: DowngradingCoefficient[];
  balancingTradesThreshold: bigint;
  lifetimeVolumeThreshold: bigint;
  manualAllocationTiers: ManualAllocationTierConfig[];
};

export type AccountIncentiveStatus = {
  account: string;
  multiplier: bigint;
  volumeTier: VolumeTierId | null;
  stakingTier: StakingTierId | null;
  projectedVolumeTier: VolumeTierId | null;
  projectedStakingTier: StakingTierId | null;
  epochTimestamp: number;
  tradingVolume: bigint;
  tierVolume: bigint;
  referralVolume: bigint;
  currentStakedBalance: bigint;
  boostIds: BoostId[];
  esGmxRewards: bigint;
  gtRewards: bigint;
  rewardsUsd: bigint;
  manualRewardCapUsd: bigint;
  manualRewardConsumedUsd: bigint;
  manualRewardRemainingUsd: bigint;
};

export type RewardsHistoryEntry = {
  epoch: number;
  tradingVolume: bigint;
  tierVolume: bigint;
  referralVolume: bigint;
  esGmxRewards: bigint;
  gtRewards: bigint;
  rewardsUsd: bigint;
  tradingEsGmxRewards: bigint;
  tradingGtRewards: bigint;
  tradingRewardsUsd: bigint;
  referralEsGmxRewards: bigint;
  referralGtRewards: bigint;
  referralRewardsUsd: bigint;
  manualRewardsUsd: bigint;
};

export type AccountRewardsHistoryPage = {
  entries: RewardsHistoryEntry[];
  totalCount: number;
  hasNextPage: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  address: string;
  tradingVolume: bigint;
  referralVolume: bigint;
  esGmxRewards: bigint;
  gtRewards: bigint;
  rewardsUsd: bigint;
  multiplier: bigint | null;
};

export type IncentivesLeaderboardPage = {
  entries: LeaderboardEntry[];
  totalCount: number;
  hasNextPage: boolean;
};

export type IncentiveAccountEpochAuditEntry = {
  id: string;
  account: string;
  epochTimestamp: number;
  fees: bigint;
  tradingVolume: bigint;
  tierVolume: bigint;
  referralVolume: bigint;
  esGmxRewards: bigint;
  gtRewards: bigint;
  rewardsUsd: bigint;
  manualRewardsUsd: bigint;
  avgMultiplier: number;
  maxMultiplier: number;
  volumeTier: VolumeTierId | null;
  stakingTier: StakingTierId | null;
  boostIds: BoostId[];
  effectiveRewardsRatio: number;
};

export type IncentiveAccountEpochAuditPage = {
  entries: IncentiveAccountEpochAuditEntry[];
  totalCount: number;
  hasNextPage: boolean;
};
