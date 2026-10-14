import type { GtBuybackRequest, GtBuybackRequestStatus, GtBuybackSummary } from "domain/gtBuyback/useGtBuybackSummary";
import { USDC_DECIMALS } from "domain/gtBuyback/useGtBuybackSummary";
import type { UserIncentiveDistribution } from "domain/synthetics/common/useUserIncentiveData";
import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import type { LatestGtPrice } from "domain/synthetics/incentives/v2/useLatestGtPrice";
import { getVestingData, type StakingProcessedData } from "lib/legacy";
import { parseValue, PRECISION, USD_DECIMALS } from "lib/numbers";
import type { BuybackWeeklyStatsResponse } from "sdk/utils/buyback/types";
import type { StakingPowerResponse } from "sdk/utils/staking/types";

import { REWARDS_TESTER_ACCOUNT, REWARDS_TESTER_CUSTOM_SCENARIO_ID } from "./rewardsTesterFixtures";

// Local-only test data for the Earn pages. Nothing here can sign or send a transaction.
const TOKEN_UNIT = 10n ** BigInt(ES_GMX_DECIMALS);
const GT_UNIT = 10n ** BigInt(GT_DECIMALS);
const DAY_SECONDS = 24 * 60 * 60;
const WEEK_SECONDS = 7 * DAY_SECONDS;
const REWARDS_TESTER_EARN_DEFAULT_GMX_PRICE = 20n * PRECISION;
const REWARDS_TESTER_EARN_DEFAULT_GT_PRICE = 10n * PRECISION;
const REWARDS_TESTER_EARN_NATIVE_PRICE = 3_000n * PRECISION;
const REWARDS_TESTER_EARN_RANK = 128;
const REWARDS_TESTER_EARN_TREASURY_GMX = 1_000_000n * TOKEN_UNIT;
const REWARDS_TESTER_EARN_WEEKLY_BUYBACK_GMX = 12_000n * TOKEN_UNIT;
const REWARDS_TESTER_EARN_POWER_MULTIPLIER = 30n;
const REWARDS_TESTER_EARN_SHARE_PRECISION = 1_000_000;
const REWARDS_TESTER_EARN_MAX_LP_POSITIONS = 24;

type RewardsTesterEarnOption<T extends string> = { value: T; label: string };

export type RewardsTesterEarnConnection = "disconnected" | "initializing" | "loading" | "connected";

// Empty GMX price / accumulated rewards fields keep a live or derived value.
export type RewardsTesterEarnValues = {
  connection: RewardsTesterEarnConnection;
  gmxPrice: string;
  stakedGmx: string;
  walletGmx: string;
  stakedEsGmx: string;
  walletEsGmx: string;
  vestedEsGmx: string;
  lifetimeStakingUsd: string;
  powerSharePercent: string;
  accumulatedRewardsGmx: string;
  accumulatedRewardsUsd: string;
  gtAmount: string;
  gtUsd: string;
  lpPositions: string;
  lpValueUsd: string;
  buybackQuotaTotal: string;
  buybackQuotaUsed: string;
  buybackReferralCode: string;
  buybackRequestGt: string;
  buybackRequestStatus: "none" | GtBuybackRequestStatus;
  buybackWithdrawableUsdc: string;
  buybackTotalBoughtBackUsdc: string;
  buybackSmartContractWallet: "no" | "yes";
  buybackSeason: string;
  buybackHistory: "none" | "few" | "long";
  // Requests withdrawn through the simulated flow: comma-separated "gtAmount:createdAt" pairs.
  buybackWithdrawnRequests: string;
};

export type RewardsTesterEarnToggles = {
  gt: "scenario" | "none" | "dust" | "typical" | "big" | "no-price" | "price-zero";
  rewardsPaused: "off" | "on";
  treasury: "value" | "accumulating" | "none";
  loyalty: "none" | "safe" | "warning" | "danger";
  claimable: "nothing" | "some";
  lpEarnings: "ok" | "loading" | "unavailable";
  lpLocation: "wallet" | "multichain";
  distributionHistory: "empty" | "few" | "many" | "partial-error";
  claimables: "none" | "no-gas" | "gas-ok";
  gtBuyback: "scenario" | "none" | "loading";
  gtBuybackSign:
    | "approve"
    | "reject"
    | "reject-evm"
    | "reject-solana"
    | "reject-ref-evm"
    | "reject-ref-solana"
    | "insufficient-sol";
  gtBuybackCodeCheck: "available" | "taken";
  gtBuybackSolana: "connected" | "not-connected" | "refuse";
  gtBuybackExistingCode: "none" | "has";
  gtBuybackHistory: "scenario" | "none" | "few" | "long";
};

// Base fixture: a connected account with no assets.
export const REWARDS_TESTER_EARN_BASE_VALUES: RewardsTesterEarnValues = {
  connection: "connected",
  gmxPrice: "",
  stakedGmx: "0",
  walletGmx: "0",
  stakedEsGmx: "0",
  walletEsGmx: "0",
  vestedEsGmx: "0",
  lifetimeStakingUsd: "0",
  powerSharePercent: "0",
  accumulatedRewardsGmx: "",
  accumulatedRewardsUsd: "",
  gtAmount: "0",
  gtUsd: "0",
  lpPositions: "0",
  lpValueUsd: "2500",
  buybackQuotaTotal: "0",
  buybackQuotaUsed: "0",
  buybackReferralCode: "",
  buybackRequestGt: "0",
  buybackRequestStatus: "none",
  buybackWithdrawableUsdc: "0",
  buybackTotalBoughtBackUsdc: "0",
  buybackSmartContractWallet: "no",
  buybackSeason: "",
  buybackHistory: "none",
  buybackWithdrawnRequests: "",
};

export const REWARDS_TESTER_EARN_DEFAULT_TOGGLES: RewardsTesterEarnToggles = {
  gt: "scenario",
  rewardsPaused: "off",
  treasury: "value",
  loyalty: "none",
  claimable: "nothing",
  lpEarnings: "ok",
  lpLocation: "wallet",
  distributionHistory: "empty",
  claimables: "none",
  gtBuyback: "none",
  gtBuybackSign: "approve",
  gtBuybackCodeCheck: "available",
  gtBuybackSolana: "not-connected",
  gtBuybackExistingCode: "none",
  gtBuybackHistory: "scenario",
};

const REWARDS_TESTER_EARN_STAKER_VALUES: Partial<RewardsTesterEarnValues> = {
  gmxPrice: "8.75",
  stakedGmx: "1250",
  walletGmx: "40",
  lifetimeStakingUsd: "845.32",
  powerSharePercent: "0.042",
};

export const REWARDS_TESTER_EARN_SCENARIO_GROUPS = [
  "Page",
  "Portfolio",
  "LP",
  "GT card",
  "GT buyback",
  "Distributions",
] as const;

export type RewardsTesterEarnScenarioGroup = (typeof REWARDS_TESTER_EARN_SCENARIO_GROUPS)[number];

export type RewardsTesterEarnScenario = {
  id: string;
  group: RewardsTesterEarnScenarioGroup;
  label: string;
  hint?: string;
  override: Partial<RewardsTesterEarnValues>;
  // Area switches for this scenario, merged onto REWARDS_TESTER_EARN_DEFAULT_TOGGLES when it is picked.
  toggles?: Partial<RewardsTesterEarnToggles>;
};

const REWARDS_TESTER_EARN_BUYBACK_GT: Partial<RewardsTesterEarnValues> = {
  gtAmount: "12",
  gtUsd: "120",
  buybackSeason: "Season 1",
};

const REWARDS_TESTER_EARN_BUYBACK_QUOTA: Partial<RewardsTesterEarnValues> = {
  ...REWARDS_TESTER_EARN_BUYBACK_GT,
  buybackQuotaTotal: "50",
  buybackQuotaUsed: "10",
  buybackReferralCode: "GMXFRIEND",
  buybackTotalBoughtBackUsdc: "0",
};

function getRewardsTesterEarnBuybackScenarios(): RewardsTesterEarnScenario[] {
  const scenario = (
    id: string,
    label: string,
    override: Partial<RewardsTesterEarnValues>,
    toggles: Partial<RewardsTesterEarnToggles> = { gtBuyback: "scenario" }
  ): RewardsTesterEarnScenario => ({ id: `earn-buyback-${id}`, group: "GT buyback", label, override, toggles });
  const request = (status: GtBuybackRequestStatus) => ({
    ...REWARDS_TESTER_EARN_BUYBACK_QUOTA,
    buybackRequestGt: "5",
    buybackRequestStatus: status,
  });

  const scenarios = [
    scenario("no-quota", "No quota yet", { ...REWARDS_TESTER_EARN_BUYBACK_GT, buybackReferralCode: "GMXFRIEND" }),
    scenario("quota", "Quota available", REWARDS_TESTER_EARN_BUYBACK_QUOTA),
    scenario("signature", "Waiting for signature", request("waitingSignature")),
    scenario("submitting", "Submitting", request("submitting")),
    scenario("in-buyback", "In today's buyback", request("inBuyback")),
    scenario("awaiting-payout", "Awaiting payout", request("awaitingPayout")),
    scenario("withdraw", "Ready to withdraw", {
      ...REWARDS_TESTER_EARN_BUYBACK_QUOTA,
      buybackHistory: "few",
      buybackQuotaUsed: "25",
      buybackWithdrawableUsdc: "148.25",
      buybackTotalBoughtBackUsdc: "148.25",
    }),
    scenario("used-up", "Quota used up", {
      ...REWARDS_TESTER_EARN_BUYBACK_QUOTA,
      buybackHistory: "few",
      buybackQuotaUsed: "50",
      buybackTotalBoughtBackUsdc: "495",
    }),
    scenario("smart-wallet", "Smart-contract wallet", {
      ...REWARDS_TESTER_EARN_BUYBACK_QUOTA,
      buybackSmartContractWallet: "yes",
    }),
    scenario("loading", "Loading", REWARDS_TESTER_EARN_BUYBACK_QUOTA, { gtBuyback: "loading" }),
    // Without a referral code there are no referees, so no quota (base values: quota 0, no request, nothing withdrawable).
    scenario("no-code", "No referral code", { ...REWARDS_TESTER_EARN_BUYBACK_GT, buybackReferralCode: "" }),
    scenario("big", "Big numbers", {
      ...REWARDS_TESTER_EARN_BUYBACK_QUOTA,
      buybackHistory: "long",
      gtAmount: "1234567.89",
      gtUsd: "2469135.78",
      buybackQuotaTotal: "1234567",
      buybackQuotaUsed: "234567",
      buybackTotalBoughtBackUsdc: "9876543.21",
    }),
  ];
  // User-journey order for the preset buttons.
  const order = [
    "loading",
    "smart-wallet",
    "no-code",
    "no-quota",
    "quota",
    "signature",
    "submitting",
    "in-buyback",
    "awaiting-payout",
    "withdraw",
    "used-up",
    "big",
  ].map((id) => `earn-buyback-${id}`);

  return [...scenarios].sort((first, second) => order.indexOf(first.id) - order.indexOf(second.id));
}

// Add new Earn states here: each one is a partial override merged onto REWARDS_TESTER_EARN_BASE_VALUES.
export const REWARDS_TESTER_EARN_SCENARIOS: RewardsTesterEarnScenario[] = [
  { id: "earn-guest", group: "Page", label: "Guest", hint: "No wallet", override: { connection: "disconnected" } },
  {
    id: "earn-initializing",
    group: "Page",
    label: "Wallet initializing",
    override: { connection: "initializing" },
  },
  { id: "earn-loading", group: "Page", label: "Connected loading", override: { connection: "loading" } },
  {
    id: "earn-new-user",
    group: "Portfolio",
    label: "New user",
    hint: "No assets yet, nothing to claim",
    override: {},
  },
  {
    id: "earn-staker",
    group: "Portfolio",
    label: "GMX staker",
    hint: "APR, loyalty 95%, staking power, pending rewards",
    override: REWARDS_TESTER_EARN_STAKER_VALUES,
    toggles: { loyalty: "safe", claimable: "some" },
  },
  {
    id: "earn-paused",
    group: "Portfolio",
    label: "Rewards paused",
    hint: "Paused badge, treasury value",
    override: REWARDS_TESTER_EARN_STAKER_VALUES,
    toggles: { loyalty: "safe", rewardsPaused: "on" },
  },
  {
    id: "earn-paused-accumulating",
    group: "Portfolio",
    label: "Paused, accumulating",
    override: REWARDS_TESTER_EARN_STAKER_VALUES,
    toggles: { loyalty: "safe", rewardsPaused: "on", treasury: "accumulating" },
  },
  {
    id: "earn-loyalty-danger",
    group: "Portfolio",
    label: "Loyalty danger",
    hint: "Loyalty 82%, power reset 3 times",
    override: REWARDS_TESTER_EARN_STAKER_VALUES,
    toggles: { loyalty: "danger", claimable: "some" },
  },
  {
    id: "earn-esgmx",
    group: "Portfolio",
    label: "esGMX + vesting",
    hint: "esGMX only, vesting in the retired GMX vault",
    override: {
      gmxPrice: "8.75",
      stakedEsGmx: "120",
      walletEsGmx: "30",
      vestedEsGmx: "200",
      lifetimeStakingUsd: "96.4",
      powerSharePercent: "0.004",
    },
    toggles: { claimable: "some", loyalty: "safe" },
  },
  {
    id: "earn-whale",
    group: "Portfolio",
    label: "Whale",
    hint: "Values above $1B, share 0.000%",
    override: {
      gmxPrice: "8.75",
      stakedGmx: "150000000",
      walletGmx: "2500000",
      stakedEsGmx: "4000000",
      lifetimeStakingUsd: "1234567890.12",
      powerSharePercent: "0.0001",
      gtAmount: "1234567.89",
      gtUsd: "2469135.78",
      lpPositions: "6",
      lpValueUsd: "250000000",
    },
    toggles: { loyalty: "safe", claimable: "some" },
  },
  {
    id: "earn-gt-only",
    group: "GT card",
    label: "GT only",
    hint: "Single GT card, 12 GT ($120.00)",
    override: { gtAmount: "12", gtUsd: "120" },
  },
  {
    id: "earn-ticket",
    group: "GT card",
    label: "Dust GT + staked GMX",
    hint: "0.0000468 GT, 6.5731 GMX staked at $8.75",
    override: {
      gtAmount: "0.0000468",
      gtUsd: "0.000468",
      gmxPrice: "8.75",
      stakedGmx: "6.5731",
      accumulatedRewardsGmx: "0.14",
      accumulatedRewardsUsd: "1.18",
    },
  },
  { id: "earn-gt-big", group: "GT card", label: "Big GT", override: { gtAmount: "1234567.89", gtUsd: "2469135.78" } },
  {
    id: "earn-gt-no-price",
    group: "GT card",
    label: "GT price missing",
    override: { gtAmount: "12", gtUsd: "120" },
    toggles: { gt: "no-price" },
  },
  {
    id: "earn-gt-zero-price",
    group: "GT card",
    label: "GT price 0",
    override: { gtAmount: "12", gtUsd: "0" },
    toggles: { gt: "price-zero" },
  },
  {
    id: "earn-many-lp",
    group: "LP",
    label: "Many LP positions",
    hint: "12 GM and GLV cards",
    override: { ...REWARDS_TESTER_EARN_STAKER_VALUES, lpPositions: "12", lpValueUsd: "25000" },
    toggles: { loyalty: "safe" },
  },
  {
    id: "earn-multichain-lp",
    group: "LP",
    label: "Multichain LP",
    hint: "Balances partly in the GMX Account",
    override: { lpPositions: "3", lpValueUsd: "4000" },
    toggles: { lpLocation: "multichain" },
  },
  {
    id: "earn-lp-down",
    group: "LP",
    label: "LP data down",
    hint: "Earnings and performance unavailable",
    override: { lpPositions: "3", lpValueUsd: "4000" },
    toggles: { lpEarnings: "unavailable" },
  },
  ...getRewardsTesterEarnBuybackScenarios(),
  {
    id: "earn-distributions-many",
    group: "Distributions",
    label: "Many distributions",
    hint: "40 history rows, claimables",
    override: {},
    toggles: { distributionHistory: "many", claimables: "gas-ok" },
  },
  {
    id: "earn-distributions-error",
    group: "Distributions",
    label: "History partial error",
    override: {},
    toggles: { distributionHistory: "partial-error", claimables: "no-gas" },
  },
  {
    id: "earn-distributions-empty",
    group: "Distributions",
    label: "Nothing distributed",
    override: {},
    toggles: { distributionHistory: "empty", claimables: "none" },
  },
];

type RewardsTesterEarnToggleKey = keyof RewardsTesterEarnToggles;

export const REWARDS_TESTER_EARN_TOGGLE_FIELDS: {
  [K in RewardsTesterEarnToggleKey]: {
    key: K;
    label: string;
    options: RewardsTesterEarnOption<RewardsTesterEarnToggles[K]>[];
  };
}[RewardsTesterEarnToggleKey][] = [
  {
    key: "gt",
    label: "GT card",
    options: [
      { value: "scenario", label: "From scenario" },
      { value: "none", label: "No GT" },
      { value: "dust", label: "Dust (< $0.01)" },
      { value: "typical", label: "12 GT" },
      { value: "big", label: "1.2M GT" },
      { value: "no-price", label: "No price" },
      { value: "price-zero", label: "Price 0" },
    ],
  },
  {
    key: "rewardsPaused",
    label: "Rewards paused",
    options: [
      { value: "off", label: "Off" },
      { value: "on", label: "On" },
    ],
  },
  {
    key: "treasury",
    label: "Treasury rewards",
    options: [
      { value: "value", label: "Value" },
      { value: "accumulating", label: "Accumulating" },
      { value: "none", label: "No projection" },
    ],
  },
  {
    key: "loyalty",
    label: "Loyalty",
    options: [
      { value: "none", label: "Not tracked" },
      { value: "safe", label: "Safe (95%)" },
      { value: "warning", label: "Warning (87%)" },
      { value: "danger", label: "Danger (82%)" },
    ],
  },
  {
    key: "claimable",
    label: "Pending claimable",
    options: [
      { value: "nothing", label: "Nothing" },
      { value: "some", label: "Some" },
    ],
  },
  {
    key: "lpEarnings",
    label: "LP earnings",
    options: [
      { value: "ok", label: "OK" },
      { value: "loading", label: "Loading" },
      { value: "unavailable", label: "Unavailable" },
    ],
  },
  {
    key: "lpLocation",
    label: "LP balances",
    options: [
      { value: "wallet", label: "Wallet only" },
      { value: "multichain", label: "Wallet + GMX Account" },
    ],
  },
  {
    key: "distributionHistory",
    label: "Distribution history",
    options: [
      { value: "empty", label: "Empty" },
      { value: "few", label: "A few rows" },
      { value: "many", label: "Many rows" },
      { value: "partial-error", label: "Partial error" },
    ],
  },
  {
    key: "gtBuyback",
    label: "GT buyback data",
    options: [
      { value: "scenario", label: "From scenario" },
      { value: "none", label: "None (live)" },
      { value: "loading", label: "Loading" },
    ],
  },
  {
    key: "gtBuybackHistory",
    label: "Buyback history",
    options: [
      { value: "scenario", label: "From scenario" },
      { value: "none", label: "None" },
      { value: "few", label: "Few (3 rows)" },
      { value: "long", label: "Long (12 rows)" },
    ],
  },
  {
    key: "gtBuybackSign",
    label: "Sign result",
    options: [
      { value: "approve", label: "Approve all" },
      { value: "reject", label: "Reject sale signature" },
      { value: "reject-evm", label: "Reject EVM signature" },
      { value: "reject-solana", label: "Reject Solana transaction" },
      { value: "reject-ref-evm", label: "Reject referral EVM signature" },
      { value: "reject-ref-solana", label: "Reject referral Solana tx" },
      { value: "insufficient-sol", label: "Not enough SOL" },
    ],
  },
  {
    key: "gtBuybackCodeCheck",
    label: "Code check",
    options: [
      { value: "available", label: "Available" },
      { value: "taken", label: "Taken" },
    ],
  },
  {
    key: "gtBuybackSolana",
    label: "Solana wallet",
    options: [
      { value: "connected", label: "Connected" },
      { value: "not-connected", label: "Not connected" },
      { value: "refuse", label: "Refuse to connect" },
    ],
  },
  {
    key: "gtBuybackExistingCode",
    label: "Existing GMX code",
    options: [
      { value: "none", label: "None" },
      { value: "has", label: "Has one" },
    ],
  },
  {
    key: "claimables",
    label: "Claimable distributions",
    options: [
      { value: "none", label: "None" },
      { value: "no-gas", label: "Some, no gas" },
      { value: "gas-ok", label: "Some, gas OK" },
    ],
  },
];

export type RewardsTesterEarnField =
  | { key: keyof RewardsTesterEarnValues; label: string; type: "text"; placeholder?: string }
  | {
      key: keyof RewardsTesterEarnValues;
      label: string;
      type: "select";
      options: RewardsTesterEarnOption<string>[];
    };

export const REWARDS_TESTER_EARN_FIELD_SECTIONS: { title: string; fields: RewardsTesterEarnField[] }[] = [
  {
    title: "Wallet",
    fields: [
      {
        key: "connection",
        label: "Wallet",
        type: "select",
        options: [
          { value: "disconnected", label: "Disconnected" },
          { value: "initializing", label: "Initializing" },
          { value: "loading", label: "Connected, loading" },
          { value: "connected", label: "Connected" },
        ],
      },
    ],
  },
  {
    title: "GMX card and staking",
    fields: [
      { key: "gmxPrice", label: "GMX price (USD)", type: "text", placeholder: "live" },
      { key: "stakedGmx", label: "Staked GMX", type: "text" },
      { key: "walletGmx", label: "Wallet GMX", type: "text" },
      { key: "stakedEsGmx", label: "Staked esGMX", type: "text" },
      { key: "walletEsGmx", label: "Wallet esGMX", type: "text" },
      { key: "vestedEsGmx", label: "Vested esGMX (GMX vault)", type: "text" },
      { key: "lifetimeStakingUsd", label: "Lifetime staking (USD)", type: "text" },
      { key: "powerSharePercent", label: "Power share (%)", type: "text" },
      { key: "accumulatedRewardsGmx", label: "Accumulated (GMX)", type: "text", placeholder: "auto" },
      { key: "accumulatedRewardsUsd", label: "Accumulated (USD)", type: "text", placeholder: "auto" },
    ],
  },
  {
    title: "GT card",
    fields: [
      { key: "gtAmount", label: "GT amount", type: "text" },
      { key: "gtUsd", label: "GT (USD)", type: "text" },
    ],
  },
  {
    title: "GT buyback",
    fields: [
      { key: "buybackQuotaTotal", label: "Quota total (GT)", type: "text" },
      { key: "buybackQuotaUsed", label: "Quota used (GT)", type: "text" },
      { key: "buybackReferralCode", label: "Referral code", type: "text", placeholder: "none" },
      { key: "buybackRequestGt", label: "Active request (GT)", type: "text" },
      {
        key: "buybackRequestStatus",
        label: "Request status",
        type: "select",
        options: [
          { value: "none", label: "No request" },
          { value: "waitingSignature", label: "Waiting for signature" },
          { value: "submitting", label: "Submitting" },
          { value: "inBuyback", label: "In buyback" },
          { value: "awaitingPayout", label: "Awaiting payout" },
          { value: "paid", label: "Paid" },
          { value: "withdrawn", label: "Withdrawn" },
        ],
      },
      { key: "buybackWithdrawableUsdc", label: "Withdrawable (USDC)", type: "text" },
      { key: "buybackTotalBoughtBackUsdc", label: "Total bought back (USDC)", type: "text" },
      { key: "buybackSeason", label: "Season", type: "text", placeholder: "none" },
      {
        key: "buybackSmartContractWallet",
        label: "Smart-contract wallet",
        type: "select",
        options: [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
        ],
      },
    ],
  },
  {
    title: "LP",
    fields: [
      { key: "lpPositions", label: "GM/GLV positions", type: "text" },
      { key: "lpValueUsd", label: "Largest position (USD)", type: "text" },
    ],
  },
];

export function getRewardsTesterEarnScenario(id: string) {
  return REWARDS_TESTER_EARN_SCENARIOS.find((scenario) => scenario.id === id);
}

export function getRewardsTesterEarnScenarioState(id: string) {
  const scenario = getRewardsTesterEarnScenario(id);

  if (!scenario) return undefined;

  return {
    scenarioId: id,
    values: { ...REWARDS_TESTER_EARN_BASE_VALUES, ...scenario.override },
    toggles: { ...REWARDS_TESTER_EARN_DEFAULT_TOGGLES, ...scenario.toggles },
  };
}

export function isRewardsTesterEarnCustomScenario(id: string) {
  return id === REWARDS_TESTER_CUSTOM_SCENARIO_ID;
}

export type RewardsTesterEarnTreasury = {
  stakingPowerData: StakingPowerResponse;
  projectedRewardGmx?: bigint;
  projectedRewardUsd?: bigint;
  isTreasuryAccumulating: boolean;
};

export type RewardsTesterEarnData = {
  account?: string;
  connection: RewardsTesterEarnConnection;
  isWalletInitializing: boolean;
  isLoading: boolean;
  gtRewards: bigint;
  leaderboardEntries: LeaderboardEntry[];
  gtPrice: LatestGtPrice | null;
  gmxPrice?: bigint;
  processedDataOverrides: Partial<StakingProcessedData>;
  treasury?: RewardsTesterEarnTreasury;
  buybackWeeklyStats?: BuybackWeeklyStatsResponse;
  vestingData?: ReturnType<typeof getVestingData>;
  lpPositions: number;
  lpValueUsd: bigint;
  lpEarnings: RewardsTesterEarnToggles["lpEarnings"];
  lpLocation: RewardsTesterEarnToggles["lpLocation"];
  distributionHistory: RewardsTesterEarnToggles["distributionHistory"];
  claimables: RewardsTesterEarnToggles["claimables"];
  safeUnstakeLimit?: bigint;
  gtBuyback?: { data: GtBuybackSummary | undefined; isLoading: boolean };
  nowSeconds: number;
};

function parseRewardsTesterEarnAmount(value: string, decimals: number) {
  if (value.trim() === "") return undefined;

  const amount = parseValue(value.trim(), decimals);

  return amount !== undefined && amount >= 0n ? amount : undefined;
}

function parseRewardsTesterEarnOptionalAmount(value: string, decimals: number) {
  return value.trim() === "" ? null : parseRewardsTesterEarnAmount(value, decimals);
}

function divideRoundingUp(value: bigint, divisor: bigint) {
  return (value + divisor - 1n) / divisor;
}

function getRewardsTesterEarnGt(
  toggle: RewardsTesterEarnToggles["gt"],
  amount: bigint,
  usd: bigint
): { amount: bigint; priceUsd: bigint | null } {
  switch (toggle) {
    case "none":
      return { amount: 0n, priceUsd: REWARDS_TESTER_EARN_DEFAULT_GT_PRICE };
    case "dust":
      return { amount: 468n, priceUsd: REWARDS_TESTER_EARN_DEFAULT_GT_PRICE };
    case "typical":
      return { amount: 12n * GT_UNIT, priceUsd: REWARDS_TESTER_EARN_DEFAULT_GT_PRICE };
    case "big":
      return { amount: 12_345_678_900n, priceUsd: 2n * PRECISION };
    case "no-price":
      return { amount: amount > 0n ? amount : 12n * GT_UNIT, priceUsd: null };
    case "price-zero":
      return { amount: amount > 0n ? amount : 12n * GT_UNIT, priceUsd: 0n };
    default:
      return {
        amount,
        priceUsd: amount > 0n ? divideRoundingUp(usd * GT_UNIT, amount) : REWARDS_TESTER_EARN_DEFAULT_GT_PRICE,
      };
  }
}

function getRewardsTesterEarnLoyalty(loyalty: RewardsTesterEarnToggles["loyalty"]) {
  switch (loyalty) {
    case "safe":
      return { loyaltyRatio: 0.95, powerResetCount: 0 };
    case "warning":
      return { loyaltyRatio: 0.87, powerResetCount: 1 };
    case "danger":
      return { loyaltyRatio: 0.82, powerResetCount: 3 };
    default:
      return { loyaltyRatio: null, powerResetCount: 0 };
  }
}

function buildRewardsTesterEarnBuybackStats(nowSeconds: number): BuybackWeeklyStatsResponse {
  const weekCount = 8;
  const firstWeekStart = nowSeconds - weekCount * WEEK_SECONDS - DAY_SECONDS;
  let cumulative = 0n;
  const weeks = Array.from({ length: weekCount }, (_, index) => {
    const weeklyAccrued = REWARDS_TESTER_EARN_WEEKLY_BUYBACK_GMX + BigInt(index) * 250n * TOKEN_UNIT;
    cumulative += weeklyAccrued;

    return {
      weekStart: firstWeekStart + index * WEEK_SECONDS,
      weekEnd: firstWeekStart + (index + 1) * WEEK_SECONDS,
      weeklyAccrued: weeklyAccrued.toString(),
      cumulativeAccrued: cumulative.toString(),
    };
  });

  return {
    summary: {
      totalAccrued: cumulative.toString(),
      latestWeekAccrued: weeks[weeks.length - 1].weeklyAccrued,
      weeksTracked: weekCount,
    },
    weeks,
    months: [],
  };
}

function buildRewardsTesterEarnVestingData(vestedEsGmx: bigint, stakedTotal: bigint) {
  const gmxVester = [
    0n,
    vestedEsGmx,
    (vestedEsGmx * 6n) / 10n,
    (vestedEsGmx * 3n) / 10n,
    vestedEsGmx / 10n,
    vestedEsGmx * 2n,
    stakedTotal,
  ];
  const glpVester = [0n, 0n, 0n, 0n, 0n, 0n, 0n];
  const affiliateVested = vestedEsGmx / 10n;
  const affiliateVester = [
    0n,
    affiliateVested,
    affiliateVested / 2n,
    affiliateVested / 4n,
    affiliateVested / 4n,
    affiliateVested,
    0n,
  ];

  return getVestingData([...gmxVester, ...glpVester, ...affiliateVester]);
}

export function buildRewardsTesterEarnData(
  values: RewardsTesterEarnValues,
  toggles: RewardsTesterEarnToggles,
  nowSeconds = Math.floor(Date.now() / 1000 / 60) * 60
): RewardsTesterEarnData | undefined {
  const parsed = {
    gmxPrice: parseRewardsTesterEarnOptionalAmount(values.gmxPrice, USD_DECIMALS),
    stakedGmx: parseRewardsTesterEarnAmount(values.stakedGmx, ES_GMX_DECIMALS),
    walletGmx: parseRewardsTesterEarnAmount(values.walletGmx, ES_GMX_DECIMALS),
    stakedEsGmx: parseRewardsTesterEarnAmount(values.stakedEsGmx, ES_GMX_DECIMALS),
    walletEsGmx: parseRewardsTesterEarnAmount(values.walletEsGmx, ES_GMX_DECIMALS),
    vestedEsGmx: parseRewardsTesterEarnAmount(values.vestedEsGmx, ES_GMX_DECIMALS),
    lifetimeStakingUsd: parseRewardsTesterEarnAmount(values.lifetimeStakingUsd, USD_DECIMALS),
    accumulatedGmx: parseRewardsTesterEarnOptionalAmount(values.accumulatedRewardsGmx, ES_GMX_DECIMALS),
    accumulatedUsd: parseRewardsTesterEarnOptionalAmount(values.accumulatedRewardsUsd, USD_DECIMALS),
    gtAmount: parseRewardsTesterEarnAmount(values.gtAmount, GT_DECIMALS),
    gtUsd: parseRewardsTesterEarnAmount(values.gtUsd, USD_DECIMALS),
    lpValueUsd: parseRewardsTesterEarnAmount(values.lpValueUsd, USD_DECIMALS),
    buybackQuotaTotal: parseRewardsTesterEarnAmount(values.buybackQuotaTotal, GT_DECIMALS),
    buybackQuotaUsed: parseRewardsTesterEarnAmount(values.buybackQuotaUsed, GT_DECIMALS),
    buybackRequestGt: parseRewardsTesterEarnAmount(values.buybackRequestGt, GT_DECIMALS),
    buybackWithdrawableUsdc: parseRewardsTesterEarnAmount(values.buybackWithdrawableUsdc, USDC_DECIMALS),
    buybackTotalBoughtBackUsdc: parseRewardsTesterEarnAmount(values.buybackTotalBoughtBackUsdc, USDC_DECIMALS),
  };
  const powerSharePercent = Number(values.powerSharePercent);
  const lpPositions = Number(values.lpPositions);

  if (
    !["disconnected", "initializing", "loading", "connected"].includes(values.connection) ||
    Object.values(parsed).some((value) => value === undefined) ||
    !Number.isFinite(powerSharePercent) ||
    powerSharePercent < 0 ||
    powerSharePercent > 100 ||
    !Number.isInteger(lpPositions) ||
    lpPositions < 0 ||
    lpPositions > REWARDS_TESTER_EARN_MAX_LP_POSITIONS
  ) {
    return undefined;
  }

  const stakedGmx = parsed.stakedGmx!;
  const walletGmx = parsed.walletGmx!;
  const stakedEsGmx = parsed.stakedEsGmx!;
  const walletEsGmx = parsed.walletEsGmx!;
  const vestedEsGmx = parsed.vestedEsGmx!;
  const lifetimeStakingUsd = parsed.lifetimeStakingUsd!;
  const gmxPrice = parsed.gmxPrice ?? undefined;
  const usdPrice = gmxPrice ?? REWARDS_TESTER_EARN_DEFAULT_GMX_PRICE;
  const toUsd = (amount: bigint) => (amount * usdPrice) / TOKEN_UNIT;
  const gt = getRewardsTesterEarnGt(toggles.gt, parsed.gtAmount!, parsed.gtUsd!);
  const gtPrice = gt.priceUsd === null ? null : { priceUsd: gt.priceUsd, timestamp: nowSeconds };
  const shared = {
    connection: values.connection,
    gtPrice,
    gmxPrice,
    lpPositions,
    lpValueUsd: parsed.lpValueUsd!,
    lpEarnings: toggles.lpEarnings,
    lpLocation: toggles.lpLocation,
    distributionHistory: toggles.distributionHistory,
    claimables: toggles.claimables,
    nowSeconds,
  };

  if (values.connection === "disconnected" || values.connection === "initializing") {
    return {
      ...shared,
      isWalletInitializing: values.connection === "initializing",
      isLoading: false,
      gtRewards: 0n,
      leaderboardEntries: [],
      processedDataOverrides: {},
    };
  }

  const stakedTotal = stakedGmx + stakedEsGmx;
  const loyalty = getRewardsTesterEarnLoyalty(toggles.loyalty);
  const historicalMaxStaked = toggles.loyalty === "none" || stakedTotal === 0n ? null : stakedTotal;
  const cumulativePower = stakedTotal * REWARDS_TESTER_EARN_POWER_MULTIPLIER;
  const shareMicros = BigInt(Math.round(powerSharePercent * REWARDS_TESTER_EARN_SHARE_PRECISION));
  const totalNetworkPower =
    cumulativePower === 0n
      ? 1n
      : shareMicros === 0n
        ? cumulativePower * 1_000_000_000n
        : (cumulativePower * 100n * BigInt(REWARDS_TESTER_EARN_SHARE_PRECISION)) / shareMicros;
  const accumulatedGmx = parsed.accumulatedGmx ?? stakedTotal / 400n;
  const isTreasuryAccumulating = toggles.treasury === "accumulating";
  const hasProjection = toggles.treasury === "value";
  const stakingPowerData: StakingPowerResponse = {
    cumulativePower,
    totalNetworkPower,
    userSharePercent: powerSharePercent,
    historicalMaxStaked,
    currentStaked: stakedTotal,
    loyaltyRatio: loyalty.loyaltyRatio,
    lastPowerResetAt: loyalty.powerResetCount > 0 ? nowSeconds - 30 * DAY_SECONDS : null,
    powerResetCount: loyalty.powerResetCount,
    projectedRewardShare: hasProjection ? accumulatedGmx : null,
    treasuryGmxBalance: isTreasuryAccumulating ? null : REWARDS_TESTER_EARN_TREASURY_GMX,
    powerAccrualStart: 0,
    loyaltyTrackingStart: 0,
  };
  const hasClaimable = toggles.claimable === "some";
  const claimableGmx = hasClaimable ? (85n * TOKEN_UNIT) / 100n : 0n;
  const claimableEsGmx = hasClaimable ? (32n * TOKEN_UNIT) / 10n : 0n;
  const claimableNative = hasClaimable ? (42n * TOKEN_UNIT) / 10_000n : 0n;
  const claimableNativeUsd = (claimableNative * REWARDS_TESTER_EARN_NATIVE_PRICE) / TOKEN_UNIT;
  const lifetimeGmxUsd = (lifetimeStakingUsd * 6n) / 10n;
  const lifetimeEsGmxUsd = (lifetimeStakingUsd * 3n) / 10n;
  const lifetimeNativeUsd = lifetimeStakingUsd - lifetimeGmxUsd - lifetimeEsGmxUsd;
  const safeUnstakeLimit = historicalMaxStaked === null ? undefined : stakedTotal - (stakedTotal * 80n + 99n) / 100n;

  return {
    ...shared,
    account: REWARDS_TESTER_ACCOUNT,
    isWalletInitializing: false,
    isLoading: values.connection === "loading",
    gtRewards: gt.amount,
    leaderboardEntries:
      gt.amount > 0n
        ? [
            {
              rank: REWARDS_TESTER_EARN_RANK,
              address: REWARDS_TESTER_ACCOUNT,
              tradingVolume: 0n,
              referralVolume: 0n,
              esGmxRewards: 0n,
              gtRewards: gt.amount,
              rewardsUsd: 0n,
              multiplier: null,
            },
          ]
        : [],
    processedDataOverrides: {
      gmxInStakedGmx: stakedGmx,
      gmxInStakedGmxUsd: toUsd(stakedGmx),
      gmxBalance: walletGmx,
      gmxBalanceUsd: toUsd(walletGmx),
      esGmxInStakedGmx: stakedEsGmx,
      esGmxInStakedGmxUsd: toUsd(stakedEsGmx),
      esGmxBalance: walletEsGmx,
      esGmxBalanceUsd: toUsd(walletEsGmx),
      isRewardsSuspended: toggles.rewardsPaused === "on",
      totalGmxRewards: claimableGmx,
      totalGmxRewardsUsd: toUsd(claimableGmx),
      totalEsGmxRewards: claimableEsGmx,
      totalEsGmxRewardsUsd: toUsd(claimableEsGmx),
      totalNativeTokenRewards: claimableNative,
      totalNativeTokenRewardsUsd: claimableNativeUsd,
      totalVesterRewards: 0n,
      totalVesterRewardsUsd: 0n,
      totalRewardsUsd: toUsd(claimableGmx) + toUsd(claimableEsGmx) + claimableNativeUsd,
      extendedGmxTrackerRewards: claimableEsGmx,
      extendedGmxTrackerRewardsUsd: toUsd(claimableEsGmx),
      cumulativeGmxRewards: (lifetimeGmxUsd * TOKEN_UNIT) / usdPrice,
      cumulativeGmxRewardsUsd: lifetimeGmxUsd,
      cumulativeEsGmxRewards: (lifetimeEsGmxUsd * TOKEN_UNIT) / usdPrice,
      cumulativeEsGmxRewardsUsd: lifetimeEsGmxUsd,
      cumulativeNativeTokenRewards: (lifetimeNativeUsd * TOKEN_UNIT) / REWARDS_TESTER_EARN_NATIVE_PRICE,
      cumulativeNativeTokenRewardsUsd: lifetimeNativeUsd,
    },
    treasury: {
      stakingPowerData,
      projectedRewardGmx: hasProjection ? accumulatedGmx : undefined,
      projectedRewardUsd: hasProjection ? parsed.accumulatedUsd ?? toUsd(accumulatedGmx) : undefined,
      isTreasuryAccumulating,
    },
    buybackWeeklyStats: buildRewardsTesterEarnBuybackStats(nowSeconds),
    vestingData: buildRewardsTesterEarnVestingData(vestedEsGmx, stakedTotal),
    safeUnstakeLimit,
    gtBuyback:
      toggles.gtBuyback === "none"
        ? undefined
        : toggles.gtBuyback === "loading" || values.connection === "loading"
          ? { data: undefined, isLoading: true }
          : {
              data: buildRewardsTesterEarnGtBuyback(values, {
                gtBalance: gt.amount,
                quotaTotal: parsed.buybackQuotaTotal!,
                quotaUsed: parsed.buybackQuotaUsed!,
                requestGt: parsed.buybackRequestGt!,
                withdrawableUsdc: parsed.buybackWithdrawableUsdc!,
                totalBoughtBackUsdc: parsed.buybackTotalBoughtBackUsdc!,
                nowSeconds,
                history: toggles.gtBuybackHistory === "scenario" ? values.buybackHistory : toggles.gtBuybackHistory,
              }),
              isLoading: false,
            },
  };
}

const REWARDS_TESTER_EARN_BUYBACK_PRICE_USDC = 9_880_000n;
const REWARDS_TESTER_EARN_BUYBACK_WINDOW_SECONDS = 5 * 60 * 60 + 12 * 60;

function buildRewardsTesterEarnGtBuyback(
  values: RewardsTesterEarnValues,
  amounts: {
    gtBalance: bigint;
    quotaTotal: bigint;
    quotaUsed: bigint;
    requestGt: bigint;
    withdrawableUsdc: bigint;
    totalBoughtBackUsdc: bigint;
    nowSeconds: number;
    history: RewardsTesterEarnValues["buybackHistory"];
  }
): GtBuybackSummary {
  const status = values.buybackRequestStatus;
  const hasRequest = status !== "none" && amounts.requestGt > 0n;
  const hasPayout = status === "awaitingPayout" || status === "paid" || status === "withdrawn";

  return {
    gtBalance: amounts.gtBalance,
    quotaTotal: amounts.quotaTotal,
    quotaUsed: amounts.quotaUsed,
    referralCode: values.buybackReferralCode.trim() || undefined,
    activeRequest: hasRequest
      ? {
          id: "rewards-tester-buyback-request",
          gtAmount: amounts.requestGt,
          usdcAmount: hasPayout ? getRewardsTesterEarnBuybackUsdc(amounts.requestGt) : undefined,
          status,
          createdAt: amounts.nowSeconds - 2 * 60 * 60,
          windowEndsAt:
            status === "inBuyback" ? amounts.nowSeconds + REWARDS_TESTER_EARN_BUYBACK_WINDOW_SECONDS : undefined,
        }
      : undefined,
    withdrawableUsdc: amounts.withdrawableUsdc,
    totalBoughtBackUsdc: amounts.totalBoughtBackUsdc,
    isSmartContractWallet: values.buybackSmartContractWallet === "yes",
    season: values.buybackSeason.trim() || undefined,
    history: [
      ...getRewardsTesterEarnWithdrawnRequests(values.buybackWithdrawnRequests),
      ...buildRewardsTesterEarnBuybackHistory(amounts.history, amounts.nowSeconds),
    ],
  };
}

export function getRewardsTesterEarnBuybackUsdc(gtAmount: bigint) {
  return (gtAmount * REWARDS_TESTER_EARN_BUYBACK_PRICE_USDC) / GT_UNIT;
}

function getRewardsTesterEarnWithdrawnRequests(value: string): GtBuybackRequest[] {
  return value
    .split(",")
    .map((item) => item.split(":"))
    .filter(([gtAmount, createdAt]) => /^\d+$/.test(gtAmount ?? "") && /^\d+$/.test(createdAt ?? ""))
    .map(([gtAmount, createdAt], index) => ({
      id: `rewards-tester-buyback-withdrawn-${index}`,
      gtAmount: BigInt(gtAmount),
      usdcAmount: getRewardsTesterEarnBuybackUsdc(BigInt(gtAmount)),
      status: "withdrawn" as const,
      createdAt: Number(createdAt),
    }));
}

function buildRewardsTesterEarnBuybackHistory(
  history: RewardsTesterEarnValues["buybackHistory"],
  nowSeconds: number
): GtBuybackRequest[] {
  const count = history === "long" ? 12 : history === "few" ? 3 : 0;

  return Array.from({ length: count }, (_, index) => {
    const gtAmount = BigInt(5 + ((index * 13) % 36)) * GT_UNIT;
    const daysAgo = history === "long" ? (index + 1) * 4 : (index + 1) * 2;

    return {
      id: `rewards-tester-buyback-history-${index}`,
      gtAmount,
      usdcAmount: getRewardsTesterEarnBuybackUsdc(gtAmount),
      status: index < (history === "long" ? 2 : 1) ? ("paid" as const) : ("withdrawn" as const),
      createdAt: nowSeconds - daysAgo * DAY_SECONDS,
    };
  });
}

const REWARDS_TESTER_EARN_DISTRIBUTION_TYPE_IDS = ["1001", "2001", "1002", "9999"];

export function getRewardsTesterEarnPlaceholderHash(index: number) {
  return `0x${(0xd15000 + index).toString(16).padStart(64, "0")}` as `0x${string}`;
}

export function buildRewardsTesterEarnDistributions(
  data: RewardsTesterEarnData,
  tokens: { address: string; decimals: number }[]
): UserIncentiveDistribution[] {
  const count =
    data.distributionHistory === "many" ? 40 : data.distributionHistory === "empty" ? 0 : data.account ? 4 : 0;

  if (tokens.length === 0) return [];

  return Array.from({ length: count }, (_, index) => {
    const token = tokens[index % tokens.length];
    const amount = BigInt(25 + ((index * 37) % 400)) * 10n ** BigInt(token.decimals);

    return {
      id: `rewards-tester-distribution-${index}`,
      typeId: REWARDS_TESTER_EARN_DISTRIBUTION_TYPE_IDS[index % REWARDS_TESTER_EARN_DISTRIBUTION_TYPE_IDS.length],
      amounts: [amount.toString()],
      amountsInUsd: [(BigInt(25 + ((index * 37) % 400)) * PRECISION).toString()],
      tokens: [token.address],
      timestamp: data.nowSeconds - (index + 1) * 3 * DAY_SECONDS,
      transactionHash: getRewardsTesterEarnPlaceholderHash(index),
    } as unknown as UserIncentiveDistribution;
  });
}
