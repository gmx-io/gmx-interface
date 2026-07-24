import { isDevelopment } from "config/env";
import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { PRECISION } from "lib/numbers";

export const REWARDS_DEBUG_SEARCH_PARAM = "rewardsDebug";

export const REWARDS_DEBUG_MODES = [
  "loading",
  "error",
  "empty",
  "banners",
  "vesting-idle",
  "vesting-active",
  "vesting-complete",
  "vesting-error",
  "vesting-loading",
] as const;

export type RewardsDebugMode = (typeof REWARDS_DEBUG_MODES)[number];

const TOKEN_UNIT = 10n ** BigInt(ES_GMX_DECIMALS);

const REWARDS_DEBUG_CONFIG: IncentivesConfig = {
  epochTimestamp: 2_000_000_000,
  epochStartTimestamp: 2_000_000_000,
  programStartTimestamp: 1_900_000_000,
  epochDuration: 604_800,
  maxMultiplier: 1_000n,
  multiplierDecimals: 100n,
  volumeTierPersistenceEpochs: 4,
  feeShareFactor: PRECISION / 10n,
  esGmxShareFactor: PRECISION / 2n,
  gtShareFactor: PRECISION / 2n,
  referralRewardShareFactor: PRECISION / 20n,
  volumeTiers: [
    { tier: "Tier1", threshold: 1_000n * PRECISION, multiplier: 25n },
    { tier: "Tier2", threshold: 5_000n * PRECISION, multiplier: 50n },
  ],
  stakingTiers: [
    { tier: "Tier1", threshold: 100n * TOKEN_UNIT, multiplier: 10n },
    { tier: "Tier2", threshold: 500n * TOKEN_UNIT, multiplier: 25n },
  ],
  boosts: [
    { boost: "FeaturedMarkets", multiplier: 25n },
    { boost: "BalancingTrades", multiplier: 50n },
    { boost: "LifetimeTrading", multiplier: 100n },
    { boost: "ManualAllocation", multiplier: 200n },
  ],
  featuredMarketIndexTokens: ["0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a"],
  downgradingCoefficients: [],
  balancingTradesThreshold: 10_000n * PRECISION,
  lifetimeVolumeThreshold: 1_000_000n * PRECISION,
  manualAllocationTiers: [
    { minVolume: 10_000n * PRECISION, maxVolume: 250_000n * PRECISION, rewardCapUsd: 50n * PRECISION },
    { minVolume: 750_000_000n * PRECISION, maxVolume: null, rewardCapUsd: 25_000n * PRECISION },
  ],
};

export function getRewardsDebugMode(search: string, development = isDevelopment()): RewardsDebugMode | undefined {
  if (!development) return undefined;

  const mode = new URLSearchParams(search).get(REWARDS_DEBUG_SEARCH_PARAM);

  return REWARDS_DEBUG_MODES.find((candidate) => candidate === mode);
}

export function getRewardsDebugConfig(mode: RewardsDebugMode | undefined): IncentivesConfig | undefined {
  if (mode === "banners" || mode?.startsWith("vesting-")) {
    return REWARDS_DEBUG_CONFIG;
  }

  return undefined;
}
