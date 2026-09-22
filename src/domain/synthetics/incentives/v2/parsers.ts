import type { BoostId, IncentivesConfig, StakingTierId, VolumeTierId } from "./types";

type RawVolumeTierConfig = {
  tier: VolumeTierId;
  threshold: string;
  multiplier: string;
};

type RawStakingTierConfig = {
  tier: StakingTierId;
  threshold: string;
  multiplier: string;
};

type RawBoostConfig = {
  boost: BoostId;
  multiplier: string;
};

export type RawIncentivesConfig = {
  epochTimestamp: number;
  epochStartTimestamp: number;
  programStartTimestamp: number;
  epochDuration: number;
  maxMultiplier: string;
  multiplierDecimals: string;
  volumeTierPersistenceEpochs: number;
  feeShareFactor: string;
  esGmxShareFactor: string;
  gtShareFactor: string;
  referralRewardShareFactor: string;
  volumeTiers: RawVolumeTierConfig[];
  stakingTiers: RawStakingTierConfig[];
  boosts: RawBoostConfig[];
  featuredMarketTokens: string[];
  downgradingFactors: { market: string; factor: string }[];
  balancingTradesThreshold: string;
  lifetimeVolumeThreshold: string;
  manualAllocationTiers: { minVolume: string; maxVolume: string | null; rewardCapUsd: string }[];
};

function compareBigInts(a: bigint, b: bigint) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function parseIncentivesConfig(config: RawIncentivesConfig | null): IncentivesConfig | null {
  if (config === null) return null;

  return {
    epochTimestamp: config.epochTimestamp,
    epochStartTimestamp: config.epochStartTimestamp,
    programStartTimestamp: config.programStartTimestamp,
    epochDuration: config.epochDuration,
    maxMultiplier: BigInt(config.maxMultiplier),
    multiplierDecimals: BigInt(config.multiplierDecimals),
    volumeTierPersistenceEpochs: config.volumeTierPersistenceEpochs,
    feeShareFactor: BigInt(config.feeShareFactor),
    esGmxShareFactor: BigInt(config.esGmxShareFactor),
    gtShareFactor: BigInt(config.gtShareFactor),
    referralRewardShareFactor: BigInt(config.referralRewardShareFactor),
    volumeTiers: config.volumeTiers
      .map((tier) => ({
        tier: tier.tier,
        threshold: BigInt(tier.threshold),
        multiplier: BigInt(tier.multiplier),
      }))
      .sort((a, b) => compareBigInts(a.threshold, b.threshold)),
    stakingTiers: config.stakingTiers
      .map((tier) => ({
        tier: tier.tier,
        threshold: BigInt(tier.threshold),
        multiplier: BigInt(tier.multiplier),
      }))
      .sort((a, b) => compareBigInts(a.threshold, b.threshold)),
    boosts: config.boosts.map((boost) => ({
      boost: boost.boost,
      multiplier: BigInt(boost.multiplier),
    })),
    featuredMarketTokens: config.featuredMarketTokens,
    downgradingFactors: config.downgradingFactors.map((item) => ({
      market: item.market,
      factor: BigInt(item.factor),
    })),
    balancingTradesThreshold: BigInt(config.balancingTradesThreshold),
    lifetimeVolumeThreshold: BigInt(config.lifetimeVolumeThreshold),
    manualAllocationTiers: config.manualAllocationTiers.map((tier) => ({
      minVolume: BigInt(tier.minVolume),
      maxVolume: tier.maxVolume === null ? null : BigInt(tier.maxVolume),
      rewardCapUsd: BigInt(tier.rewardCapUsd),
    })),
  };
}
