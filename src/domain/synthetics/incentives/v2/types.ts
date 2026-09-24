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

export type DowngradingFactor = {
  market: string;
  factor: bigint;
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
  featuredMarketTokens: string[];
  downgradingFactors: DowngradingFactor[];
  balancingTradesThreshold: bigint;
  lifetimeVolumeThreshold: bigint;
  manualAllocationTiers: ManualAllocationTierConfig[];
};
