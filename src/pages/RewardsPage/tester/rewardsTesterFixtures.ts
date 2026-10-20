import { type Address, isAddressEqual } from "viem";

import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type {
  AccountIncentiveStatus,
  BoostId,
  IncentivesConfig,
  LeaderboardEntry,
  RewardsHistoryEntry,
  StakingTierId,
  VolumeTierId,
} from "domain/synthetics/incentives/v2/types";
import type { LatestGtPrice } from "domain/synthetics/incentives/v2/useLatestGtPrice";
import type { RewardsPromoActivity } from "domain/synthetics/incentives/v2/useRewardsPromoActivity";
import { getRewardsVestingAvailableAmount } from "domain/vesting/rewardsVesting";
import type { RewardsVestingData, RewardsVestingDataResult } from "domain/vesting/useRewardsVestingData";
import { parseValue, PRECISION, USD_DECIMALS } from "lib/numbers";

import { getRewardsVestingDebugPreset, type RewardsVestingDebugSnapshot } from "../rewardsVestingDebug";

// Local-only test data for the Rewards page. Nothing here can sign or send a transaction, and every
// address is an obvious placeholder.
export const REWARDS_TESTER_ACCOUNT = "0x00000000000000000000000000000000000000a1";

const TOKEN_UNIT = 10n ** BigInt(ES_GMX_DECIMALS);
const GT_UNIT = 10n ** BigInt(GT_DECIMALS);
const CENT_USD = PRECISION / 100n;
const MULTIPLIER_INPUT_DECIMALS = 2;
const HOUR_SECONDS = 3_600;
const DAY_SECONDS = 24 * HOUR_SECONDS;
const EPOCH_DURATION = 7 * DAY_SECONDS;
const REWARDS_TESTER_DEFAULT_GMX_PRICE = 20n * PRECISION;
const REWARDS_TESTER_DEFAULT_GT_PRICE = 10n * PRECISION;
const REWARDS_TESTER_VESTING_DURATION = 365n * 24n * 60n * 60n;
const REWARDS_TESTER_TOP_RANK_USD = 1_000_000n * PRECISION;
const REWARDS_TESTER_VOLUME_PER_REWARD_USD = 50n;
const REWARDS_TESTER_PINNED_RANK = 128;
const REWARDS_TESTER_INLINE_RANK = 4;
const REWARDS_TESTER_PAGE_SIZE = 20;
const REWARDS_TESTER_DEFAULT_REFERRAL_VOLUME = 2_500n * PRECISION;
const REWARDS_TESTER_ACTIVE_FEES_USD = 40n * PRECISION;

// Five volume and five staking tiers (+1x to +5x), so every tier name and icon can be previewed.
const REWARDS_TESTER_BASE_CONFIG: IncentivesConfig = {
  epochTimestamp: 0,
  epochStartTimestamp: 0,
  programStartTimestamp: 0,
  epochDuration: EPOCH_DURATION,
  maxMultiplier: 1_000n,
  multiplierDecimals: 100n,
  volumeTierPersistenceEpochs: 4,
  feeShareFactor: PRECISION / 10n,
  esGmxShareFactor: PRECISION / 2n,
  gtShareFactor: PRECISION / 2n,
  referralRewardShareFactor: PRECISION / 20n,
  volumeTiers: [
    { tier: "Tier1", threshold: 2n * PRECISION, multiplier: 100n },
    { tier: "Tier2", threshold: 5n * PRECISION, multiplier: 200n },
    { tier: "Tier3", threshold: 10n * PRECISION, multiplier: 300n },
    { tier: "Tier4", threshold: 15n * PRECISION, multiplier: 400n },
    { tier: "Tier5", threshold: 20n * PRECISION, multiplier: 500n },
  ],
  stakingTiers: [
    { tier: "Tier1", threshold: 1n * TOKEN_UNIT, multiplier: 100n },
    { tier: "Tier2", threshold: 5n * TOKEN_UNIT, multiplier: 200n },
    { tier: "Tier3", threshold: 10n * TOKEN_UNIT, multiplier: 300n },
    { tier: "Tier4", threshold: 15n * TOKEN_UNIT, multiplier: 400n },
    { tier: "Tier5", threshold: 20n * TOKEN_UNIT, multiplier: 500n },
  ],
  boosts: [
    { boost: "FeaturedMarkets", multiplier: 25n },
    { boost: "BalancingTrades", multiplier: 50n },
    { boost: "LifetimeTrading", multiplier: 100n },
    { boost: "ManualAllocation", multiplier: 200n },
  ],
  featuredMarketTokens: ["0x55391D178Ce46e7AC8eaAEa50A72D1A5a8A622Da"],
  downgradingFactors: [],
  balancingTradesThreshold: 10_000n * PRECISION,
  lifetimeVolumeThreshold: 1_000_000n * PRECISION,
  manualAllocationTiers: [
    { minVolume: 10_000n * PRECISION, maxVolume: 250_000n * PRECISION, rewardCapUsd: 50n * PRECISION },
    { minVolume: 750_000_000n * PRECISION, maxVolume: null, rewardCapUsd: 25_000n * PRECISION },
  ],
};

const REWARDS_TESTER_VOLUME_TIER_NAMES: Record<VolumeTierId, string> = {
  Tier1: "Ranked",
  Tier2: "Certified",
  Tier3: "Veteran",
  Tier4: "Legendary",
  Tier5: "Apex",
};

const REWARDS_TESTER_STAKING_TIER_NAMES: Record<StakingTierId, string> = {
  Tier1: "Supporter",
  Tier2: "Advocate",
  Tier3: "Guardian",
  Tier4: "Steward",
  Tier5: "Titan",
};

const REWARDS_TESTER_BANNER_TYPES = [
  "manual-reward",
  "gmx-ready-to-stake",
  "esgmx-ready-to-stake",
  "referral",
  "next-volume-tier",
  "pair-boosts",
  "restake-rewards",
] as const;

export const REWARDS_TESTER_ALL_BANNERS_DISMISSED = Object.fromEntries(
  REWARDS_TESTER_BANNER_TYPES.map((type) => [type, true])
) as Record<(typeof REWARDS_TESTER_BANNER_TYPES)[number], boolean>;

type RewardsTesterOption<T extends string> = { value: T; label: string };

function getRewardsTesterTierLabel(name: string, multiplier: bigint) {
  return `${name} (+${Number(multiplier) / Number(REWARDS_TESTER_BASE_CONFIG.multiplierDecimals)}x)`;
}

const REWARDS_TESTER_VOLUME_TIER_OPTIONS: RewardsTesterOption<VolumeTierId>[] =
  REWARDS_TESTER_BASE_CONFIG.volumeTiers.map((tier) => ({
    value: tier.tier,
    label: getRewardsTesterTierLabel(REWARDS_TESTER_VOLUME_TIER_NAMES[tier.tier], tier.multiplier),
  }));

const REWARDS_TESTER_STAKING_TIER_OPTIONS: RewardsTesterOption<StakingTierId>[] =
  REWARDS_TESTER_BASE_CONFIG.stakingTiers.map((tier) => ({
    value: tier.tier,
    label: getRewardsTesterTierLabel(REWARDS_TESTER_STAKING_TIER_NAMES[tier.tier], tier.multiplier),
  }));

export type RewardsTesterProgram = "active" | "stale" | "loading" | "error" | "inactive" | "unsupported-chain";
export type RewardsTesterConnection = "disconnected" | "restoring" | "connected" | "loading" | "unavailable";
export type RewardsTesterAccountWarning = "none" | "epoch-mismatch" | "refresh-error";
export type RewardsTesterBoosts = "none" | "some" | "all";

export type RewardsTesterValues = {
  program: RewardsTesterProgram;
  connection: RewardsTesterConnection;
  accountWarning: RewardsTesterAccountWarning;
  epochEndsInHours: string;
  allTimeRewardsUsd: string;
  vestableEsGmx: string;
  vestableEsGmxUsd: string;
  vestableGt: string;
  vestableGtUsd: string;
  walletGmx: string;
  walletEsGmx: string;
  multiplier: string;
  volumeTier: VolumeTierId | "none";
  projectedVolumeTier: VolumeTierId | "same" | "none";
  stakingTier: StakingTierId | "none";
  projectedStakingTier: StakingTierId | "same" | "none";
  volumeThisEpochUsd: string;
  gmxStaked: string;
  boosts: RewardsTesterBoosts;
  referralVolumeUsd: string;
  comebackCapUsd: string;
  comebackRemainingUsd: string;
};

export type RewardsTesterToggles = {
  boosts: "scenario" | RewardsTesterBoosts;
  leaderboardRow: "scenario" | "pinned" | "inline" | "na" | "error";
  leaderboardTable: "one-page" | "many-pages" | "empty" | "loading" | "error";
  history: "one-page" | "many-pages" | "ending-soon" | "empty" | "loading" | "first-load-error" | "refresh-error";
  vesting: "scenario" | "zero" | "idle" | "active" | "complete" | "loading" | "error";
  gmxPrice: "available" | "missing";
  gtPrice: "available" | "missing";
  banners: "live" | "none-dismissed" | "all-dismissed";
  suppressOnboarding: "on" | "off";
};

// Base fixture every scenario is merged onto: a connected account with a 3x multiplier.
export const REWARDS_TESTER_BASE_VALUES: RewardsTesterValues = {
  program: "active",
  connection: "connected",
  accountWarning: "none",
  epochEndsInHours: "108",
  allTimeRewardsUsd: "1200.11",
  vestableEsGmx: "298",
  vestableEsGmxUsd: "120",
  vestableGt: "12",
  vestableGtUsd: "120",
  walletGmx: "0",
  walletEsGmx: "0",
  multiplier: "",
  volumeTier: "Tier2",
  projectedVolumeTier: "same",
  stakingTier: "Tier1",
  projectedStakingTier: "same",
  volumeThisEpochUsd: "0",
  gmxStaked: "2.02",
  boosts: "none",
  referralVolumeUsd: "0",
  comebackCapUsd: "0",
  comebackRemainingUsd: "0",
};

export const REWARDS_TESTER_DEFAULT_TOGGLES: RewardsTesterToggles = {
  boosts: "scenario",
  leaderboardRow: "scenario",
  leaderboardTable: "one-page",
  history: "one-page",
  vesting: "scenario",
  gmxPrice: "available",
  gtPrice: "available",
  banners: "live",
  suppressOnboarding: "on",
};

const REWARDS_TESTER_ZERO_VALUES: Partial<RewardsTesterValues> = {
  allTimeRewardsUsd: "0",
  vestableEsGmx: "0",
  vestableEsGmxUsd: "0",
  vestableGt: "0",
  vestableGtUsd: "0",
  walletGmx: "0",
  walletEsGmx: "0",
  multiplier: "",
  volumeTier: "none",
  projectedVolumeTier: "same",
  stakingTier: "none",
  projectedStakingTier: "same",
  volumeThisEpochUsd: "0",
  gmxStaked: "0",
  boosts: "none",
};

const REWARDS_TESTER_BIG_VALUES: Partial<RewardsTesterValues> = {
  allTimeRewardsUsd: "12345678.90",
  vestableEsGmx: "9876543.21",
  vestableEsGmxUsd: "246913580.25",
  vestableGt: "1234567.89",
  vestableGtUsd: "2469135.78",
  walletGmx: "123456.78",
  walletEsGmx: "98765.43",
  multiplier: "",
  volumeTier: "Tier5",
  projectedVolumeTier: "same",
  stakingTier: "Tier5",
  projectedStakingTier: "same",
  volumeThisEpochUsd: "12345678.90",
  gmxStaked: "98765.43",
  referralVolumeUsd: "4567890.12",
};

export const REWARDS_TESTER_SCENARIO_GROUPS = ["Page", "Account", "Multiplier", "Summary", "Banners & modals"] as const;

export type RewardsTesterScenarioGroup = (typeof REWARDS_TESTER_SCENARIO_GROUPS)[number];

export type RewardsTesterScenario = {
  id: string;
  group: RewardsTesterScenarioGroup;
  label: string;
  hint?: string;
  override: Partial<RewardsTesterValues>;
};

export const REWARDS_TESTER_LIVE_SCENARIO_ID = "live";
export const REWARDS_TESTER_CUSTOM_SCENARIO_ID = "custom";

// Add new states here: each one is a partial override merged onto REWARDS_TESTER_BASE_VALUES.
export const REWARDS_TESTER_SCENARIOS: RewardsTesterScenario[] = [
  {
    id: "disconnected",
    group: "Page",
    label: "Guest",
    hint: "No wallet connected, program active",
    override: { connection: "disconnected" },
  },
  {
    id: "restoring",
    group: "Page",
    label: "Wallet restoring",
    hint: "A remembered wallet is reconnecting",
    override: { connection: "restoring" },
  },
  {
    id: "program-loading",
    group: "Page",
    label: "Program loading",
    override: { program: "loading" },
  },
  {
    id: "program-error",
    group: "Page",
    label: "Program error",
    hint: "Incentives service unavailable",
    override: { program: "error" },
  },
  {
    id: "program-inactive",
    group: "Page",
    label: "Program inactive",
    override: { program: "inactive" },
  },
  {
    id: "unsupported-chain",
    group: "Page",
    label: "Unsupported chain",
    override: { program: "unsupported-chain" },
  },
  {
    id: "stale-config",
    group: "Page",
    label: "Stale config",
    hint: "Config refresh failed, cached config shown",
    override: { program: "stale" },
  },
  {
    id: "typical",
    group: "Account",
    label: "Typical",
    hint: "3x, Certified volume tier, Supporter staking tier",
    override: {},
  },
  {
    id: "zero",
    group: "Account",
    label: "New trader (zero)",
    hint: "Connected, nothing earned, no GMX",
    override: REWARDS_TESTER_ZERO_VALUES,
  },
  {
    id: "holder-not-staking",
    group: "Account",
    label: "Holder not staking",
    hint: "GMX and esGMX in wallet, nothing staked",
    override: {
      walletGmx: "120",
      walletEsGmx: "40",
      vestableEsGmx: "40",
      vestableEsGmxUsd: "800",
      volumeTier: "Tier1",
      volumeThisEpochUsd: "3",
      stakingTier: "none",
      gmxStaked: "0",
    },
  },
  {
    id: "account-loading",
    group: "Account",
    label: "Account loading",
    override: { connection: "loading" },
  },
  {
    id: "account-unavailable",
    group: "Account",
    label: "Account unavailable",
    hint: "Account data failed to load",
    override: { connection: "unavailable" },
  },
  {
    id: "epoch-mismatch",
    group: "Account",
    label: "Epoch mismatch warning",
    hint: "New epoch still being indexed",
    override: { accountWarning: "epoch-mismatch" },
  },
  {
    id: "refresh-error",
    group: "Account",
    label: "Refresh error warning",
    hint: "Cached account data with a refresh warning",
    override: { accountWarning: "refresh-error" },
  },
  {
    id: "climbing",
    group: "Multiplier",
    label: "Climbing",
    hint: "Projected upgrades, multiplier going up",
    override: {
      volumeTier: "Tier1",
      projectedVolumeTier: "Tier2",
      volumeThisEpochUsd: "7.5",
      stakingTier: "Tier1",
      projectedStakingTier: "Tier2",
      gmxStaked: "6",
    },
  },
  {
    id: "slipping",
    group: "Multiplier",
    label: "Slipping",
    hint: "Projected downgrades, expires in 1 day",
    override: {
      epochEndsInHours: "20",
      volumeTier: "Tier2",
      projectedVolumeTier: "Tier1",
      volumeThisEpochUsd: "3",
      stakingTier: "Tier2",
      projectedStakingTier: "Tier1",
      gmxStaked: "3",
    },
  },
  {
    id: "expiring",
    group: "Multiplier",
    label: "Expiring",
    hint: "Volume tier expires next epoch",
    override: { projectedVolumeTier: "none", volumeThisEpochUsd: "0", epochEndsInHours: "30" },
  },
  {
    id: "whale",
    group: "Multiplier",
    label: "Whale",
    hint: "Top tiers, all boosts, 10x cap, rank #1",
    override: { ...REWARDS_TESTER_BIG_VALUES, boosts: "all" },
  },
  {
    id: "comeback",
    group: "Multiplier",
    label: "Comeback bonus",
    hint: "$50 of $100 remaining",
    override: { comebackCapUsd: "100", comebackRemainingUsd: "50" },
  },
  {
    id: "comeback-dust",
    group: "Multiplier",
    label: "Comeback < $1",
    override: { comebackCapUsd: "100", comebackRemainingUsd: "0.4" },
  },
  {
    id: "comeback-used",
    group: "Multiplier",
    label: "Comeback used up",
    override: { comebackCapUsd: "100", comebackRemainingUsd: "0" },
  },
  {
    id: "indexer-lag",
    group: "Multiplier",
    label: "Indexer lag",
    hint: "Volume above the first tier but no tier yet",
    override: {
      volumeTier: "none",
      projectedVolumeTier: "none",
      volumeThisEpochUsd: "3",
      stakingTier: "none",
      gmxStaked: "0",
    },
  },
  {
    id: "big-numbers",
    group: "Summary",
    label: "Big numbers",
    hint: "Large values, top tiers, 10x",
    override: REWARDS_TESTER_BIG_VALUES,
  },
  {
    id: "tiny-decimals",
    group: "Summary",
    label: "Tiny decimals",
    hint: "Sub-cent values and dust amounts",
    override: {
      allTimeRewardsUsd: "0.004",
      vestableEsGmx: "0.0001",
      vestableEsGmxUsd: "0.002",
      vestableGt: "0.0001",
      vestableGtUsd: "0.001",
      walletGmx: "0.0001",
      walletEsGmx: "0",
      multiplier: "0.01",
      volumeTier: "none",
      stakingTier: "none",
      volumeThisEpochUsd: "0.004",
      gmxStaked: "0.0001",
    },
  },
  {
    id: "all-banners",
    group: "Banners & modals",
    label: "All promo banners",
    hint: "Data that qualifies for every promo banner",
    override: {
      walletGmx: "25",
      walletEsGmx: "40",
      vestableEsGmx: "40",
      vestableEsGmxUsd: "800",
      volumeTier: "Tier1",
      volumeThisEpochUsd: "4",
      stakingTier: "Tier1",
      gmxStaked: "2",
      boosts: "none",
      comebackCapUsd: "100",
      comebackRemainingUsd: "50",
    },
  },
];

type RewardsTesterToggleKey = keyof RewardsTesterToggles;

export const REWARDS_TESTER_TOGGLE_FIELDS: {
  [K in RewardsTesterToggleKey]: { key: K; label: string; options: RewardsTesterOption<RewardsTesterToggles[K]>[] };
}[RewardsTesterToggleKey][] = [
  {
    key: "boosts",
    label: "Activity boosts",
    options: [
      { value: "scenario", label: "From scenario" },
      { value: "none", label: "None" },
      { value: "some", label: "Some" },
      { value: "all", label: "All" },
    ],
  },
  {
    key: "leaderboardRow",
    label: "Leaderboard: your row",
    options: [
      { value: "scenario", label: "From scenario" },
      { value: "pinned", label: "Pinned on top" },
      { value: "inline", label: "Inline on page 1" },
      { value: "na", label: "Not ranked (N/A)" },
      { value: "error", label: "Rank error" },
    ],
  },
  {
    key: "leaderboardTable",
    label: "Leaderboard: table",
    options: [
      { value: "one-page", label: "One page" },
      { value: "many-pages", label: "Many pages" },
      { value: "empty", label: "Empty" },
      { value: "loading", label: "Loading" },
      { value: "error", label: "Error" },
    ],
  },
  {
    key: "history",
    label: "Rewards history",
    options: [
      { value: "one-page", label: "One page" },
      { value: "many-pages", label: "Many pages" },
      { value: "ending-soon", label: "Epoch ending soon" },
      { value: "empty", label: "Empty" },
      { value: "loading", label: "Loading" },
      { value: "first-load-error", label: "First-load error" },
      { value: "refresh-error", label: "Refresh error" },
    ],
  },
  {
    key: "vesting",
    label: "Vesting card",
    options: [
      { value: "scenario", label: "From scenario" },
      { value: "zero", label: "Simulator: Zero state" },
      { value: "idle", label: "Simulator: Idle" },
      { value: "active", label: "Simulator: Active" },
      { value: "complete", label: "Simulator: Complete" },
      { value: "loading", label: "Loading" },
      { value: "error", label: "Error" },
    ],
  },
  {
    key: "gmxPrice",
    label: "GMX price",
    options: [
      { value: "available", label: "Available" },
      { value: "missing", label: "Missing" },
    ],
  },
  {
    key: "gtPrice",
    label: "GT price",
    options: [
      { value: "available", label: "Available" },
      { value: "missing", label: "Missing" },
    ],
  },
  {
    key: "banners",
    label: "Promo banners dismissed",
    options: [
      { value: "live", label: "As clicked" },
      { value: "none-dismissed", label: "None" },
      { value: "all-dismissed", label: "All" },
    ],
  },
  {
    key: "suppressOnboarding",
    label: "Onboarding auto-open",
    options: [
      { value: "on", label: "Suppressed" },
      { value: "off", label: "Allowed" },
    ],
  },
];

type RewardsTesterValueKey = keyof RewardsTesterValues;

export type RewardsTesterField =
  | { key: RewardsTesterValueKey; label: string; type: "text"; placeholder?: string }
  | { key: RewardsTesterValueKey; label: string; type: "select"; options: RewardsTesterOption<string>[] };

const REWARDS_TESTER_SAME_TIER_OPTION = { value: "same", label: "Same as current" };
const REWARDS_TESTER_NO_TIER_OPTION = { value: "none", label: "None" };

export const REWARDS_TESTER_FIELD_SECTIONS: { title: string; fields: RewardsTesterField[] }[] = [
  {
    title: "Page and account",
    fields: [
      {
        key: "program",
        label: "Program",
        type: "select",
        options: [
          { value: "active", label: "Active" },
          { value: "stale", label: "Active, stale config" },
          { value: "loading", label: "Loading" },
          { value: "error", label: "Error" },
          { value: "inactive", label: "Inactive" },
          { value: "unsupported-chain", label: "Unsupported chain" },
        ],
      },
      {
        key: "connection",
        label: "Wallet and data",
        type: "select",
        options: [
          { value: "disconnected", label: "Disconnected" },
          { value: "restoring", label: "Wallet restoring" },
          { value: "connected", label: "Connected" },
          { value: "loading", label: "Connected, loading" },
          { value: "unavailable", label: "Connected, unavailable" },
        ],
      },
      {
        key: "accountWarning",
        label: "Account warning",
        type: "select",
        options: [
          { value: "none", label: "None" },
          { value: "epoch-mismatch", label: "Epoch mismatch" },
          { value: "refresh-error", label: "Refresh error" },
        ],
      },
      { key: "epochEndsInHours", label: "Epoch ends in (hours)", type: "text" },
    ],
  },
  {
    title: "Summary",
    fields: [
      { key: "allTimeRewardsUsd", label: "All-time rewards (USD)", type: "text" },
      { key: "vestableEsGmx", label: "Vestable esGMX", type: "text" },
      { key: "vestableEsGmxUsd", label: "Vestable esGMX (USD)", type: "text" },
      { key: "vestableGt", label: "GT earned", type: "text" },
      { key: "vestableGtUsd", label: "GT earned (USD)", type: "text" },
      { key: "walletGmx", label: "Wallet GMX", type: "text" },
      { key: "walletEsGmx", label: "Wallet esGMX", type: "text" },
    ],
  },
  {
    title: "Multiplier",
    fields: [
      { key: "multiplier", label: "Current multiplier (x)", type: "text", placeholder: "auto" },
      {
        key: "volumeTier",
        label: "Volume tier",
        type: "select",
        options: [REWARDS_TESTER_NO_TIER_OPTION, ...REWARDS_TESTER_VOLUME_TIER_OPTIONS],
      },
      {
        key: "projectedVolumeTier",
        label: "Projected volume tier",
        type: "select",
        options: [
          REWARDS_TESTER_SAME_TIER_OPTION,
          REWARDS_TESTER_NO_TIER_OPTION,
          ...REWARDS_TESTER_VOLUME_TIER_OPTIONS,
        ],
      },
      { key: "volumeThisEpochUsd", label: "Volume this epoch (USD)", type: "text" },
      {
        key: "stakingTier",
        label: "Staking tier",
        type: "select",
        options: [REWARDS_TESTER_NO_TIER_OPTION, ...REWARDS_TESTER_STAKING_TIER_OPTIONS],
      },
      {
        key: "projectedStakingTier",
        label: "Projected staking tier",
        type: "select",
        options: [
          REWARDS_TESTER_SAME_TIER_OPTION,
          REWARDS_TESTER_NO_TIER_OPTION,
          ...REWARDS_TESTER_STAKING_TIER_OPTIONS,
        ],
      },
      { key: "gmxStaked", label: "GMX staked", type: "text" },
      {
        key: "boosts",
        label: "Activity boosts",
        type: "select",
        options: [
          { value: "none", label: "None" },
          { value: "some", label: "Some" },
          { value: "all", label: "All" },
        ],
      },
      { key: "referralVolumeUsd", label: "Referral volume (USD)", type: "text" },
      { key: "comebackCapUsd", label: "Comeback cap (USD)", type: "text" },
      { key: "comebackRemainingUsd", label: "Comeback remaining (USD)", type: "text" },
    ],
  },
];

export function getRewardsTesterScenario(id: string) {
  return REWARDS_TESTER_SCENARIOS.find((scenario) => scenario.id === id);
}

export function getRewardsTesterScenarioValues(id: string): RewardsTesterValues | undefined {
  const scenario = getRewardsTesterScenario(id);

  return scenario ? { ...REWARDS_TESTER_BASE_VALUES, ...scenario.override } : undefined;
}

export type RewardsTesterLeaderboardRow = "pinned" | "inline" | "na" | "error";

export type RewardsTesterData = {
  config: IncentivesConfig;
  program: RewardsTesterProgram;
  connection: RewardsTesterConnection;
  accountWarning: RewardsTesterAccountWarning;
  account?: string;
  isWalletInitializing: boolean;
  accountStatus?: AccountIncentiveStatus;
  allTimeEntry?: LeaderboardEntry;
  vestingResult?: Omit<RewardsVestingDataResult, "mutate">;
  vestingSnapshot?: RewardsVestingDebugSnapshot;
  gmxPrice?: bigint;
  gtPrice: LatestGtPrice | null;
  promoActivity?: RewardsPromoActivity;
  leaderboardRow: RewardsTesterLeaderboardRow;
  leaderboardTable: RewardsTesterToggles["leaderboardTable"];
  history: RewardsTesterToggles["history"];
  historyScale: { numerator: bigint; denominator: bigint; manualRewardsUsd: bigint };
  banners: RewardsTesterToggles["banners"];
  suppressOnboarding: boolean;
  error?: Error;
};

function parseRewardsTesterAmount(value: string, decimals: number) {
  if (value.trim() === "") return undefined;

  const amount = parseValue(value.trim(), decimals);

  return amount !== undefined && amount >= 0n ? amount : undefined;
}

function divideRoundingUp(value: bigint, divisor: bigint) {
  return (value + divisor - 1n) / divisor;
}

function getRewardsTesterTierMultiplier(tiers: { tier: string; multiplier: bigint }[], tier: string | null) {
  return tiers.find((item) => item.tier === tier)?.multiplier ?? 0n;
}

function isRewardsTesterOption<T extends string>(options: RewardsTesterOption<T>[], value: string): value is T {
  return options.some((option) => option.value === value);
}

function resolveRewardsTesterTier<T extends string>(options: RewardsTesterOption<T>[], value: string) {
  if (value === "none") return null;

  return isRewardsTesterOption(options, value) ? value : undefined;
}

function resolveRewardsTesterProjectedTier<T extends string>(
  options: RewardsTesterOption<T>[],
  value: string,
  current: T | null
) {
  return value === "same" ? current : resolveRewardsTesterTier(options, value);
}

export function getRewardsTesterPlaceholderAddress(index: number) {
  return `0x${(0xb0000 + index).toString(16).padStart(40, "0")}`;
}

function buildRewardsTesterConfig(epochEndsInSeconds: number, historyRows: number, nowSeconds: number) {
  const epochTimestamp = nowSeconds + epochEndsInSeconds - EPOCH_DURATION;

  return {
    ...REWARDS_TESTER_BASE_CONFIG,
    epochTimestamp,
    epochStartTimestamp: epochTimestamp,
    programStartTimestamp: epochTimestamp - (historyRows - 1) * EPOCH_DURATION,
  };
}

function getRewardsTesterBoostIds(boosts: RewardsTesterBoosts, hasComeback: boolean): BoostId[] {
  const boostIds: BoostId[] =
    boosts === "all"
      ? ["FeaturedMarkets", "BalancingTrades", "LifetimeTrading"]
      : boosts === "some"
        ? ["BalancingTrades", "LifetimeTrading"]
        : [];

  return hasComeback ? [...boostIds, "ManualAllocation"] : boostIds;
}

function buildRewardsTesterVestingData({
  vestableEsGmx,
  walletGmx,
  walletEsGmx,
  gmxStaked,
  gmxPrice,
}: {
  vestableEsGmx: bigint;
  walletGmx: bigint;
  walletEsGmx: bigint;
  gmxStaked: bigint;
  gmxPrice?: bigint;
}): RewardsVestingData {
  const claimableEsGmxRewards = vestableEsGmx > walletEsGmx ? vestableEsGmx - walletEsGmx : 0n;
  const collateral = gmxStaked > vestableEsGmx ? gmxStaked : vestableEsGmx;

  return {
    walletGmxBalance: walletGmx,
    walletEsGmxBalance: walletEsGmx,
    claimableEsGmxRewards,
    stakedGmxBalance: collateral,
    freePairAmount: collateral,
    vestingInfo: {
      pairAmount: 0n,
      vestedAmount: 0n,
      escrowedBalance: 0n,
      claimedAmounts: 0n,
      claimable: 0n,
      maxVestableAmount: vestableEsGmx,
      averageStakedAmount: vestableEsGmx,
    },
    vestingDuration: REWARDS_TESTER_VESTING_DURATION,
    gmxPrice,
  };
}

export function getRewardsTesterVestingResult(data: RewardsVestingData): Omit<RewardsVestingDataResult, "mutate"> {
  const vestableEsGmx = getRewardsVestingAvailableAmount({
    walletEsGmxAmount: data.walletEsGmxBalance + data.claimableEsGmxRewards,
    totalVestedAmount: data.vestingInfo.vestedAmount,
    maxVestableAmount: data.vestingInfo.maxVestableAmount,
  });
  const vestableEsGmxUsd =
    vestableEsGmx === 0n ? 0n : data.gmxPrice === undefined ? undefined : (vestableEsGmx * data.gmxPrice) / TOKEN_UNIT;

  return { data, vestableEsGmx, vestableEsGmxUsd, isLoading: false };
}

export function buildRewardsTesterData(
  values: RewardsTesterValues,
  toggles: RewardsTesterToggles,
  nowSeconds = Math.floor(Date.now() / 1000 / 60) * 60
): RewardsTesterData | undefined {
  const allTimeRewardsUsd = parseRewardsTesterAmount(values.allTimeRewardsUsd, USD_DECIMALS);
  const vestableEsGmx = parseRewardsTesterAmount(values.vestableEsGmx, ES_GMX_DECIMALS);
  const vestableEsGmxUsd = parseRewardsTesterAmount(values.vestableEsGmxUsd, USD_DECIMALS);
  const vestableGt = parseRewardsTesterAmount(values.vestableGt, GT_DECIMALS);
  const vestableGtUsd = parseRewardsTesterAmount(values.vestableGtUsd, USD_DECIMALS);
  const walletGmx = parseRewardsTesterAmount(values.walletGmx, ES_GMX_DECIMALS);
  const walletEsGmx = parseRewardsTesterAmount(values.walletEsGmx, ES_GMX_DECIMALS);
  const enteredMultiplier =
    values.multiplier.trim() === "" ? null : parseRewardsTesterAmount(values.multiplier, MULTIPLIER_INPUT_DECIMALS);
  const volumeThisEpochUsd = parseRewardsTesterAmount(values.volumeThisEpochUsd, USD_DECIMALS);
  const gmxStaked = parseRewardsTesterAmount(values.gmxStaked, ES_GMX_DECIMALS);
  const referralVolumeUsd = parseRewardsTesterAmount(values.referralVolumeUsd, USD_DECIMALS);
  const comebackCapUsd = parseRewardsTesterAmount(values.comebackCapUsd, USD_DECIMALS);
  const comebackRemainingUsd = parseRewardsTesterAmount(values.comebackRemainingUsd, USD_DECIMALS);
  const epochEndsInHours = Number(values.epochEndsInHours);
  const volumeTier = resolveRewardsTesterTier(REWARDS_TESTER_VOLUME_TIER_OPTIONS, values.volumeTier);
  const stakingTier = resolveRewardsTesterTier(REWARDS_TESTER_STAKING_TIER_OPTIONS, values.stakingTier);

  if (
    allTimeRewardsUsd === undefined ||
    vestableEsGmx === undefined ||
    vestableEsGmxUsd === undefined ||
    vestableGt === undefined ||
    vestableGtUsd === undefined ||
    walletGmx === undefined ||
    walletEsGmx === undefined ||
    enteredMultiplier === undefined ||
    volumeThisEpochUsd === undefined ||
    gmxStaked === undefined ||
    referralVolumeUsd === undefined ||
    comebackCapUsd === undefined ||
    comebackRemainingUsd === undefined ||
    volumeTier === undefined ||
    stakingTier === undefined ||
    !Number.isFinite(epochEndsInHours) ||
    epochEndsInHours <= 0 ||
    epochEndsInHours > EPOCH_DURATION / HOUR_SECONDS
  ) {
    return undefined;
  }

  const projectedVolumeTier = resolveRewardsTesterProjectedTier(
    REWARDS_TESTER_VOLUME_TIER_OPTIONS,
    values.projectedVolumeTier,
    volumeTier
  );
  const projectedStakingTier = resolveRewardsTesterProjectedTier(
    REWARDS_TESTER_STAKING_TIER_OPTIONS,
    values.projectedStakingTier,
    stakingTier
  );

  if (projectedVolumeTier === undefined || projectedStakingTier === undefined) return undefined;

  const historyRows = toggles.history === "many-pages" ? 48 : 6;
  const epochEndsInSeconds =
    toggles.history === "ending-soon"
      ? Math.min(2 * HOUR_SECONDS, epochEndsInHours * HOUR_SECONDS)
      : Math.round(epochEndsInHours * HOUR_SECONDS);
  const config = buildRewardsTesterConfig(epochEndsInSeconds, historyRows, nowSeconds);
  const boosts = toggles.boosts === "scenario" ? values.boosts : toggles.boosts;
  const hasComeback = comebackCapUsd > 0n;
  const comebackRemaining = comebackRemainingUsd > comebackCapUsd ? comebackCapUsd : comebackRemainingUsd;
  const boostIds = getRewardsTesterBoostIds(boosts, hasComeback);
  const persistentBoostMultiplier = config.boosts.reduce((total, boost) => {
    const isPersistent =
      boost.boost === "LifetimeTrading" || (boost.boost === "ManualAllocation" && comebackRemaining > 0n);

    return boostIds.includes(boost.boost) && isPersistent ? total + boost.multiplier : total;
  }, 0n);
  const componentMultiplier =
    getRewardsTesterTierMultiplier(config.volumeTiers, volumeTier) +
    getRewardsTesterTierMultiplier(config.stakingTiers, stakingTier) +
    persistentBoostMultiplier;
  const multiplier =
    enteredMultiplier ?? (componentMultiplier > config.maxMultiplier ? config.maxMultiplier : componentMultiplier);
  const referralVolume =
    boosts === "all" && referralVolumeUsd === 0n ? REWARDS_TESTER_DEFAULT_REFERRAL_VOLUME : referralVolumeUsd;

  // Prices are derived from the entered amount and USD value, so both show exactly as typed.
  const derivedGmxPrice =
    vestableEsGmx > 0n && vestableEsGmxUsd > 0n
      ? divideRoundingUp(vestableEsGmxUsd * TOKEN_UNIT, vestableEsGmx)
      : REWARDS_TESTER_DEFAULT_GMX_PRICE;
  const gmxPrice = toggles.gmxPrice === "missing" ? undefined : derivedGmxPrice;
  const gtPriceUsd =
    vestableGt > 0n && vestableGtUsd > 0n
      ? divideRoundingUp(vestableGtUsd * GT_UNIT, vestableGt)
      : REWARDS_TESTER_DEFAULT_GT_PRICE;
  const gtPrice = toggles.gtPrice === "missing" ? null : { priceUsd: gtPriceUsd, timestamp: config.epochTimestamp };

  const accountStatus: AccountIncentiveStatus = {
    account: REWARDS_TESTER_ACCOUNT,
    multiplier,
    volumeTier,
    stakingTier,
    projectedVolumeTier,
    projectedStakingTier,
    epochTimestamp: config.epochTimestamp,
    tradingVolume: volumeThisEpochUsd,
    tierVolume: volumeThisEpochUsd,
    referralVolume,
    currentStakedBalance: gmxStaked,
    boostIds,
    esGmxRewards: 0n,
    gtRewards: 0n,
    rewardsUsd: 0n,
    manualRewardCapUsd: hasComeback ? comebackCapUsd : 0n,
    manualRewardConsumedUsd: hasComeback ? comebackCapUsd - comebackRemaining : 0n,
    manualRewardRemainingUsd: hasComeback ? comebackRemaining : 0n,
  };

  const gtRewardsUsd = (vestableGt * gtPriceUsd) / GT_UNIT;
  const esGmxRewardsUsd = allTimeRewardsUsd > gtRewardsUsd ? allTimeRewardsUsd - gtRewardsUsd : 0n;
  const hasEarned = allTimeRewardsUsd > 0n || vestableGt > 0n;
  const allTimeEntry: LeaderboardEntry | undefined = hasEarned
    ? {
        rank: allTimeRewardsUsd >= REWARDS_TESTER_TOP_RANK_USD ? 1 : REWARDS_TESTER_PINNED_RANK,
        address: REWARDS_TESTER_ACCOUNT,
        tradingVolume: allTimeRewardsUsd * REWARDS_TESTER_VOLUME_PER_REWARD_USD,
        referralVolume,
        esGmxRewards: (esGmxRewardsUsd * TOKEN_UNIT) / derivedGmxPrice,
        gtRewards: vestableGt,
        rewardsUsd: allTimeRewardsUsd,
        multiplier,
      }
    : undefined;
  const leaderboardRow: RewardsTesterLeaderboardRow =
    toggles.leaderboardRow !== "scenario"
      ? toggles.leaderboardRow
      : !allTimeEntry
        ? "na"
        : allTimeEntry.rank <= REWARDS_TESTER_PAGE_SIZE
          ? "inline"
          : "pinned";
  const isActiveUser =
    volumeThisEpochUsd > 0n ||
    referralVolume > 0n ||
    gmxStaked > 0n ||
    boostIds.some((boostId) => boostId !== "ManualAllocation");
  const historyScale =
    allTimeRewardsUsd === 0n
      ? { numerator: 0n, denominator: 1n }
      : allTimeRewardsUsd >= REWARDS_TESTER_TOP_RANK_USD
        ? { numerator: 10_000n, denominator: 1n }
        : allTimeRewardsUsd < PRECISION
          ? { numerator: 1n, denominator: 10_000n }
          : { numerator: 1n, denominator: 1n };

  const sharedData = {
    config,
    program: values.program,
    connection: values.connection,
    accountWarning: values.accountWarning,
    gmxPrice,
    gtPrice,
    leaderboardRow,
    leaderboardTable: toggles.leaderboardTable,
    history: toggles.history,
    historyScale: { ...historyScale, manualRewardsUsd: hasComeback ? comebackCapUsd - comebackRemaining : 0n },
    banners: toggles.banners,
    suppressOnboarding: toggles.suppressOnboarding === "on",
  };

  if (values.connection === "disconnected" || values.connection === "restoring") {
    return { ...sharedData, isWalletInitializing: values.connection === "restoring" };
  }

  if (values.connection === "loading") {
    return {
      ...sharedData,
      account: REWARDS_TESTER_ACCOUNT,
      isWalletInitializing: false,
      vestingResult: { isLoading: true },
      vestingSnapshot: { isLoading: true },
    };
  }

  if (values.connection === "unavailable") {
    const error = new Error("Rewards tester: account data unavailable");

    return {
      ...sharedData,
      account: REWARDS_TESTER_ACCOUNT,
      isWalletInitializing: false,
      vestingResult: { isLoading: false, error },
      vestingSnapshot: { isLoading: false, error },
      error,
    };
  }

  let vestingResult: Omit<RewardsVestingDataResult, "mutate">;
  let vestingSnapshot: RewardsVestingDebugSnapshot;

  if (toggles.vesting === "loading") {
    vestingResult = { isLoading: true };
    vestingSnapshot = { isLoading: true };
  } else if (toggles.vesting === "error") {
    const error = new Error("Rewards tester: vesting data unavailable");
    vestingResult = { isLoading: false, error };
    vestingSnapshot = { isLoading: false, error };
  } else {
    const vestingData =
      toggles.vesting === "scenario"
        ? buildRewardsTesterVestingData({ vestableEsGmx, walletGmx, walletEsGmx, gmxStaked, gmxPrice })
        : { ...getRewardsVestingDebugPreset(toggles.vesting), ...(gmxPrice === undefined ? { gmxPrice } : {}) };
    vestingResult = getRewardsTesterVestingResult(vestingData);
    vestingSnapshot = { data: vestingData, isLoading: false };
  }

  return {
    ...sharedData,
    account: REWARDS_TESTER_ACCOUNT,
    isWalletInitializing: false,
    accountStatus,
    allTimeEntry,
    vestingResult,
    vestingSnapshot,
    promoActivity: {
      netPositionFeeUsd: isActiveUser ? REWARDS_TESTER_ACTIVE_FEES_USD : 0n,
      firstTradeTimestamp: isActiveUser ? nowSeconds - 30 * DAY_SECONDS : undefined,
    },
    error: values.accountWarning === "refresh-error" ? new Error("Rewards tester: refresh failed") : undefined,
  };
}

function createRewardsTesterLeaderboardRow(index: number, gmxPrice: bigint, gtPrice: bigint): LeaderboardEntry {
  const rewardsUsd = (30_000n * PRECISION * 100n) / (100n + BigInt(index) * 9n);

  return {
    rank: index + 1,
    address: getRewardsTesterPlaceholderAddress(index + 1),
    tradingVolume: rewardsUsd * 80n,
    referralVolume: index % 4 === 0 ? rewardsUsd * 12n : 0n,
    esGmxRewards: (((rewardsUsd * 9n) / 10n) * TOKEN_UNIT) / gmxPrice,
    gtRewards: ((rewardsUsd / 10n) * GT_UNIT) / gtPrice,
    rewardsUsd,
    multiplier: BigInt(Math.max(100, 1_000 - index * 7)),
  };
}

const rewardsTesterLeaderboardRowsCache = new WeakMap<RewardsTesterData, LeaderboardEntry[]>();

function getRewardsTesterLeaderboardRows(data: RewardsTesterData) {
  let rows = rewardsTesterLeaderboardRowsCache.get(data);

  if (!rows) {
    const count = data.leaderboardTable === "many-pages" ? 1_234 : data.leaderboardTable === "one-page" ? 18 : 0;
    const gmxPrice = data.gmxPrice ?? REWARDS_TESTER_DEFAULT_GMX_PRICE;
    const gtPrice = data.gtPrice?.priceUsd ?? REWARDS_TESTER_DEFAULT_GT_PRICE;
    rows = Array.from({ length: count }, (_, index) => createRewardsTesterLeaderboardRow(index, gmxPrice, gtPrice));

    if (data.account && data.leaderboardRow === "inline" && rows.length > 0) {
      const entryRank = data.allTimeEntry?.rank ?? REWARDS_TESTER_INLINE_RANK;
      const inlineRank = entryRank <= REWARDS_TESTER_PAGE_SIZE ? entryRank : REWARDS_TESTER_INLINE_RANK;
      const inlineIndex = Math.min(inlineRank - 1, rows.length - 1);
      rows[inlineIndex] = {
        ...(data.allTimeEntry ?? rows[inlineIndex]),
        address: data.account,
        rank: inlineIndex + 1,
      };
    }

    rewardsTesterLeaderboardRowsCache.set(data, rows);
  }

  return rows;
}

export function getRewardsTesterYourLeaderboardEntry(data: RewardsTesterData): LeaderboardEntry | undefined {
  if (!data.account || data.leaderboardRow === "na" || data.leaderboardRow === "error") return undefined;

  const inlineRow = getRewardsTesterLeaderboardRows(data).find((row) => row.address === data.account);
  if (inlineRow) return inlineRow;

  return data.allTimeEntry ? { ...data.allTimeEntry, rank: REWARDS_TESTER_PINNED_RANK } : undefined;
}

export function getRewardsTesterLeaderboardPage(
  data: RewardsTesterData,
  params: { account?: string; accountContains?: string; orderBy?: string; limit: number; offset: number }
) {
  const { account, accountContains } = params;
  let rows = getRewardsTesterLeaderboardRows(data);

  if (account) {
    if (data.account && isAddressEqual(account as Address, data.account as Address)) {
      const yourEntry = getRewardsTesterYourLeaderboardEntry(data);
      rows = yourEntry ? [yourEntry] : [];
    } else {
      rows = rows.filter((row) => isAddressEqual(row.address as Address, account as Address));
    }
  }

  if (accountContains) {
    // Fixture addresses are lowercase hex, so only the typed search term needs case folding.
    const searchTerm = accountContains.toLowerCase();
    rows = rows.filter((row) => row.address.includes(searchTerm));
  }

  const [field, direction] = (params.orderBy ?? "rewardsUsd_DESC").split("_") as [keyof LeaderboardEntry, string];

  if (field !== "rewardsUsd" || direction !== "DESC") {
    rows = [...rows].sort((first, second) => {
      const firstValue = (first[field] ?? 0n) as bigint | number;
      const secondValue = (second[field] ?? 0n) as bigint | number;
      const difference = firstValue === secondValue ? 0 : firstValue > secondValue ? 1 : -1;

      return direction === "ASC" ? difference : -difference;
    });
  }

  const entries = rows.slice(params.offset, params.offset + params.limit);

  return { entries, totalCount: rows.length, hasNextPage: params.offset + entries.length < rows.length };
}

export function getRewardsTesterHistoryPage(
  data: RewardsTesterData,
  params: {
    currentEpoch?: number;
    programStartTimestamp?: number;
    epochDuration?: number;
    limit: number;
    offset: number;
  }
) {
  const currentEpoch = params.currentEpoch ?? data.config.epochTimestamp;
  const programStart = params.programStartTimestamp ?? data.config.programStartTimestamp;
  const epochDuration = params.epochDuration ?? data.config.epochDuration;
  const totalCount =
    data.history === "empty" || epochDuration <= 0
      ? 0
      : Math.max(Math.floor((currentEpoch - programStart) / epochDuration) + 1, 0);
  const { numerator, denominator, manualRewardsUsd } = data.historyScale;
  const gmxPrice = data.gmxPrice ?? REWARDS_TESTER_DEFAULT_GMX_PRICE;
  const gtPrice = data.gtPrice?.priceUsd ?? REWARDS_TESTER_DEFAULT_GT_PRICE;
  const entries: RewardsHistoryEntry[] = [];

  for (let index = params.offset; index < Math.min(params.offset + params.limit, totalCount); index++) {
    const isQuietEpoch = index % 5 === 3;
    const baseUsd = isQuietEpoch ? 0n : BigInt(2_000 + ((index * 1_337) % 9_000)) * CENT_USD;
    const rewardsUsd = (baseUsd * numerator) / denominator;
    const tradingRewardsUsd = (rewardsUsd * 8n) / 10n;
    const referralRewardsUsd = rewardsUsd - tradingRewardsUsd;
    const toEsGmx = (usd: bigint) => (((usd * 9n) / 10n) * TOKEN_UNIT) / gmxPrice;
    const toGt = (usd: bigint) => ((usd / 10n) * GT_UNIT) / gtPrice;

    entries.push({
      epoch: currentEpoch - index * epochDuration,
      tradingVolume: rewardsUsd * 80n,
      tierVolume: rewardsUsd * 80n,
      referralVolume: rewardsUsd * 12n,
      esGmxRewards: toEsGmx(rewardsUsd),
      gtRewards: toGt(rewardsUsd),
      rewardsUsd,
      tradingEsGmxRewards: toEsGmx(tradingRewardsUsd),
      tradingGtRewards: toGt(tradingRewardsUsd),
      tradingRewardsUsd,
      referralEsGmxRewards: toEsGmx(referralRewardsUsd),
      referralGtRewards: toGt(referralRewardsUsd),
      referralRewardsUsd,
      manualRewardsUsd: index === 0 ? manualRewardsUsd : 0n,
    });
  }

  return { entries, totalCount, hasNextPage: params.offset + entries.length < totalCount };
}
