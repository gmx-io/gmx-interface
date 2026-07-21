import type {
  AccountIncentiveStatus,
  AccountRewardsHistoryPage,
  BoostId,
  IncentiveAccountEpochAuditEntry,
  IncentiveAccountEpochAuditPage,
  IncentivesConfig,
  IncentivesLeaderboardPage,
  LeaderboardEntry,
  RewardsHistoryEntry,
  StakingTierId,
  VolumeTierId,
} from "./types";

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
  featuredMarketIndexTokens: string[];
  downgradingCoefficients: { market: string; coefficient: string }[];
  balancingTradesThreshold: string;
  lifetimeVolumeThreshold: string;
  manualAllocationTiers: { minVolume: string; maxVolume: string | null; rewardCapUsd: string }[];
};

export type RawAccountIncentiveStatus = {
  account: string;
  multiplier: string;
  volumeTier: VolumeTierId | null;
  stakingTier: StakingTierId | null;
  projectedVolumeTier: VolumeTierId | null;
  projectedStakingTier: StakingTierId | null;
  epochTimestamp: number;
  tradingVolume: string;
  tierVolume: string;
  referralVolume: string;
  currentStakedBalance: string;
  boostIds: BoostId[];
  esGmxRewards: string;
  gtRewards: string;
  rewardsUsd: string;
  manualRewardCapUsd: string;
  manualRewardConsumedUsd: string;
  manualRewardRemainingUsd: string;
};

export type RawRewardsHistoryEntry = {
  epoch: number;
  tradingVolume: string;
  tierVolume: string;
  referralVolume: string;
  esGmxRewards: string;
  gtRewards: string;
  rewardsUsd: string;
  tradingEsGmxRewards: string;
  tradingGtRewards: string;
  tradingRewardsUsd: string;
  referralEsGmxRewards: string;
  referralGtRewards: string;
  referralRewardsUsd: string;
  manualRewardsUsd: string;
};

export type RawLeaderboardEntry = {
  rank: number;
  address: string;
  tradingVolume: string;
  referralVolume: string;
  esGmxRewards: string;
  gtRewards: string;
  rewardsUsd: string;
  multiplier: string | null;
};

export type RawIncentiveAccountEpochAuditEntry = {
  id: string;
  account: string;
  epochTimestamp: number;
  fees: string;
  tradingVolume: string;
  tierVolume: string;
  referralVolume: string;
  esGmxRewards: string;
  gtRewards: string;
  rewardsUsd: string;
  manualRewardsUsd: string;
  avgMultiplier: number;
  maxMultiplier: number;
  volumeTier: VolumeTierId | null;
  stakingTier: StakingTierId | null;
  boostIds: BoostId[];
  effectiveRewardsRatio: number;
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
    featuredMarketIndexTokens: config.featuredMarketIndexTokens,
    downgradingCoefficients: config.downgradingCoefficients.map((item) => ({
      market: item.market,
      coefficient: BigInt(item.coefficient),
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

export function parseAccountIncentiveStatus(status: RawAccountIncentiveStatus): AccountIncentiveStatus {
  return {
    account: status.account,
    multiplier: BigInt(status.multiplier),
    volumeTier: status.volumeTier,
    stakingTier: status.stakingTier,
    projectedVolumeTier: status.projectedVolumeTier,
    projectedStakingTier: status.projectedStakingTier,
    epochTimestamp: status.epochTimestamp,
    tradingVolume: BigInt(status.tradingVolume),
    tierVolume: BigInt(status.tierVolume),
    referralVolume: BigInt(status.referralVolume),
    currentStakedBalance: BigInt(status.currentStakedBalance),
    boostIds: status.boostIds,
    esGmxRewards: BigInt(status.esGmxRewards),
    gtRewards: BigInt(status.gtRewards),
    rewardsUsd: BigInt(status.rewardsUsd),
    manualRewardCapUsd: BigInt(status.manualRewardCapUsd),
    manualRewardConsumedUsd: BigInt(status.manualRewardConsumedUsd),
    manualRewardRemainingUsd: BigInt(status.manualRewardRemainingUsd),
  };
}

export function parseRewardsHistoryEntry(entry: RawRewardsHistoryEntry): RewardsHistoryEntry {
  return {
    epoch: entry.epoch,
    tradingVolume: BigInt(entry.tradingVolume),
    tierVolume: BigInt(entry.tierVolume),
    referralVolume: BigInt(entry.referralVolume),
    esGmxRewards: BigInt(entry.esGmxRewards),
    gtRewards: BigInt(entry.gtRewards),
    rewardsUsd: BigInt(entry.rewardsUsd),
    tradingEsGmxRewards: BigInt(entry.tradingEsGmxRewards),
    tradingGtRewards: BigInt(entry.tradingGtRewards),
    tradingRewardsUsd: BigInt(entry.tradingRewardsUsd),
    referralEsGmxRewards: BigInt(entry.referralEsGmxRewards),
    referralGtRewards: BigInt(entry.referralGtRewards),
    referralRewardsUsd: BigInt(entry.referralRewardsUsd),
    manualRewardsUsd: BigInt(entry.manualRewardsUsd),
  };
}

export function parseAccountRewardsHistoryPage(
  page: { totalCount: number; items: RawRewardsHistoryEntry[] },
  limit: number,
  offset: number
): AccountRewardsHistoryPage {
  const entries = page.items.map(parseRewardsHistoryEntry);

  return {
    entries,
    totalCount: page.totalCount,
    hasNextPage: offset + Math.min(entries.length, limit) < page.totalCount,
  };
}

export function parseLeaderboardEntry(entry: RawLeaderboardEntry): LeaderboardEntry {
  return {
    rank: entry.rank,
    address: entry.address,
    tradingVolume: BigInt(entry.tradingVolume),
    referralVolume: BigInt(entry.referralVolume),
    esGmxRewards: BigInt(entry.esGmxRewards),
    gtRewards: BigInt(entry.gtRewards),
    rewardsUsd: BigInt(entry.rewardsUsd),
    multiplier: entry.multiplier === null ? null : BigInt(entry.multiplier),
  };
}

export function parseIncentivesLeaderboardPage(
  page: { totalCount: number; items: RawLeaderboardEntry[] },
  limit: number,
  offset: number
): IncentivesLeaderboardPage {
  const entries = page.items.map(parseLeaderboardEntry);

  return {
    entries,
    totalCount: page.totalCount,
    hasNextPage: offset + Math.min(entries.length, limit) < page.totalCount,
  };
}

export function parseIncentiveAccountEpochAuditEntry(
  entry: RawIncentiveAccountEpochAuditEntry
): IncentiveAccountEpochAuditEntry {
  return {
    id: entry.id,
    account: entry.account,
    epochTimestamp: entry.epochTimestamp,
    fees: BigInt(entry.fees),
    tradingVolume: BigInt(entry.tradingVolume),
    tierVolume: BigInt(entry.tierVolume),
    referralVolume: BigInt(entry.referralVolume),
    esGmxRewards: BigInt(entry.esGmxRewards),
    gtRewards: BigInt(entry.gtRewards),
    rewardsUsd: BigInt(entry.rewardsUsd),
    manualRewardsUsd: BigInt(entry.manualRewardsUsd),
    avgMultiplier: entry.avgMultiplier,
    maxMultiplier: entry.maxMultiplier,
    volumeTier: entry.volumeTier,
    stakingTier: entry.stakingTier,
    boostIds: entry.boostIds,
    effectiveRewardsRatio: entry.effectiveRewardsRatio,
  };
}

export function parseIncentiveAccountEpochAuditPage(
  page: { totalCount: number; items: RawIncentiveAccountEpochAuditEntry[] },
  limit: number,
  offset: number
): IncentiveAccountEpochAuditPage {
  const entries = page.items.map(parseIncentiveAccountEpochAuditEntry);

  return {
    entries,
    totalCount: page.totalCount,
    hasNextPage: offset + Math.min(entries.length, limit) < page.totalCount,
  };
}
