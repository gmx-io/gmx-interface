import { useMemo } from "react";

import { ARBITRUM } from "config/chains";
import { useGmxPrice } from "domain/legacy";
import { useStakingProcessedData } from "domain/stake/useStakingProcessedData";
import { convertToUsd, getMidPrice, useTokensDataRequest, type TokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { bigintToNumber } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

import { INCENTIVES_BASE_RATE, INCENTIVES_FEE_RATE, isIncentivesEnabled, MAX_FEE_DISCOUNT_PERCENT } from "./constants";
import type { IncentivesConfig, StakingTierConfig } from "./types";
import { useAccountIncentiveDashboard } from "./useAccountIncentiveDashboard";
import { useAccountManualRewardsAllocation } from "./useAccountRewardsHistory";
import { useIncentivesConfig } from "./useIncentivesConfig";

// Calculation assumptions — these are modelling constants that have no
// equivalent in the backend config and are kept as hardcoded values.
const ASSUMED_LEVERAGE = 5;
const ASSUMED_COLLATERAL_TURNOVER = 1.5;
const MAX_GROWTH_VS_HISTORY = 1.25;
const REFERRAL_DISCOUNT = 0.0; // for max-potential banners
const STAKE_BUDGET_FRAC = 0.2; // 20% of wallet for staking budget

// Fallback values — used only when the backend config has not loaded yet.
// Once `useIncentivesConfig` resolves, the real values take precedence.
const FALLBACK_EPOCHS = 13;
const FALLBACK_MULT_CAP = 4.0;
const FALLBACK_ACTIVITY_BOOST = 1.5;
const FALLBACK_MAX_STAKE_GMX = 50_000;
const FALLBACK_MULTIPLIER_DECIMALS = 100;

/**
 * Fallback staking tiers used when the backend config is not yet loaded.
 * Maps GMX threshold -> bonus multiplier.
 */
const FALLBACK_STAKING_TIERS: { threshold: number; bonus: number }[] = [
  { threshold: 10, bonus: 0.25 },
  { threshold: 100, bonus: 0.5 },
  { threshold: 1_000, bonus: 1.0 },
  { threshold: 10_000, bonus: 1.5 },
  { threshold: 50_000, bonus: 2.0 },
];

// Helpers — derive calculation parameters from IncentivesConfig

const USD_DECIMALS = 30;
const GMX_DECIMALS = 18;
const GMX_DECIMALS_FACTOR = 10n ** 18n;

/**
 * Number of epochs used for the rolling volume window.
 * Falls back to `FALLBACK_EPOCHS` when the config is not available.
 */
function resolveEpochsWindow(config: IncentivesConfig | undefined): number {
  return config?.pointsExpirationEpochs ?? FALLBACK_EPOCHS;
}

/**
 * Maximum effective multiplier (human-readable, e.g. 4.0).
 * Derived from `config.maxMultiplier / config.multiplierDecimals`.
 */
function resolveMultiplierCap(config: IncentivesConfig | undefined): number {
  if (config?.maxMultiplier != null && config.multiplierDecimals) {
    return config.maxMultiplier / config.multiplierDecimals;
  }
  return FALLBACK_MULT_CAP;
}

/**
 * Sum of all activity-boost multipliers (human-readable, e.g. 1.5).
 * Each boost multiplier in the config is stored in `multiplierDecimals` units
 * (e.g. 50 with decimals=100 means +0.50). We sum them all to get the
 * maximum possible activity stack.
 */
function resolveActivityBoost(config: IncentivesConfig | undefined): number {
  if (!config?.boosts?.length) {
    return FALLBACK_ACTIVITY_BOOST;
  }
  const decimals = config.multiplierDecimals || FALLBACK_MULTIPLIER_DECIMALS;
  return config.boosts.reduce((sum, b) => sum + b.multiplier / decimals, 0);
}

/**
 * Maximum GMX amount worth staking, derived from the highest staking-tier
 * threshold in the config. Falls back to `FALLBACK_MAX_STAKE_GMX`.
 */
function resolveMaxStakeGmx(config: IncentivesConfig | undefined): number {
  if (!config?.stakingTiers?.length) {
    return FALLBACK_MAX_STAKE_GMX;
  }
  let max = 0;
  for (const tier of config.stakingTiers) {
    const threshold = bigintToNumber(tier.threshold, GMX_DECIMALS);
    if (threshold > max) {
      max = threshold;
    }
  }
  return max > 0 ? max : FALLBACK_MAX_STAKE_GMX;
}

/**
 * Resolve staking tiers from the on-chain config (thresholds in GMX with 18 decimals,
 * multiplier stored as raw int e.g. 25 = +0.25). Falls back to hardcoded tiers.
 */
function resolveStakingTiers(config: IncentivesConfig | undefined): { threshold: number; bonus: number }[] {
  if (!config?.stakingTiers?.length) {
    return FALLBACK_STAKING_TIERS;
  }

  const decimals = config.multiplierDecimals || FALLBACK_MULTIPLIER_DECIMALS;

  // Tiers are pre-sorted ascending by threshold in `useIncentivesConfig`.
  return config.stakingTiers.map((t: StakingTierConfig) => ({
    threshold: bigintToNumber(t.threshold, GMX_DECIMALS),
    // multiplier from config is stored in `multiplierDecimals` units (e.g. 25 = 0.25x bonus)
    bonus: t.multiplier / decimals,
  }));
}

/**
 * Given a GMX amount, find the highest staking tier bonus it qualifies for.
 */
function getStakingBonus(gmxAmount: number, tiers: { threshold: number; bonus: number }[]): number {
  let bonus = 0;
  for (const tier of tiers) {
    if (gmxAmount >= tier.threshold) {
      bonus = tier.bonus;
    }
  }
  return bonus;
}

/**
 * Compute total wallet USD value from tokens data.
 * Mirrors the logic in `useAvailableToTradeAssetSettlementChain`.
 */
function computeWalletUsd(tokensData: TokensData | undefined): bigint | undefined {
  if (!tokensData) return undefined;

  let walletUsd = 0n;
  let hasAny = false;

  for (const tokenData of Object.values(tokensData)) {
    if (tokenData.walletBalance === undefined) {
      continue;
    }
    hasAny = true;
    const usd = convertToUsd(tokenData.walletBalance, tokenData.decimals, getMidPrice(tokenData.prices));
    if (usd !== undefined) {
      walletUsd += usd;
    }
  }

  return hasAny ? walletUsd : undefined;
}

export type PersonalizedBannerData = {
  /** Whether the user has a manual allocation derived from pre-program history entries. */
  isManuallyRewarded: boolean;
  /** The manually allocated points amount (18-decimal bigint) for manually rewarded users. */
  manualAllocatedPoints: bigint | undefined;
  /** The bonus amount in USD (30-decimal bigint) for manually rewarded users. */
  manualBonusUsd: bigint | undefined;
  /** Recommended GMX amount to stake (human-readable number, e.g. 100). */
  recommendedStakeGmx: number | undefined;
  /** Estimated weekly rewards in USD (human-readable number, e.g. 12.50). */
  estimatedRewardsUsd: number | undefined;
  /** Whether we have enough data to show a personalized banner. */
  hasPersonalizedData: boolean;
  /** True while underlying data is still loading. */
  isLoading: boolean;
};

export function usePersonalizedBannerData(): PersonalizedBannerData {
  const { chainId, srcChainId } = useChainId();
  const { active, signer, account } = useWallet();

  const enabled = isIncentivesEnabled(chainId) && Boolean(account);

  const { data: config } = useIncentivesConfig(chainId);
  const { data: dashboard, loading: dashboardLoading } = useAccountIncentiveDashboard(chainId, {
    account,
    enabled,
  });
  const hasProgramStartTimestamp = config?.programStartTimestamp !== undefined;
  const { data: fetchedManualAllocatedPoints, loading: manualAllocatedPointsLoading } =
    useAccountManualRewardsAllocation(chainId, {
      account,
      programStartTimestamp: config?.programStartTimestamp,
      enabled: enabled && hasProgramStartTimestamp,
    });
  const manualAllocatedPoints = hasProgramStartTimestamp ? fetchedManualAllocatedPoints : 0n;

  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  const { data: stakingData } = useStakingProcessedData();

  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const walletUsd = useMemo(() => computeWalletUsd(tokensData), [tokensData]);

  return useMemo(() => {
    const isLoading = dashboardLoading || (hasProgramStartTimestamp && manualAllocatedPointsLoading);

    const noData: PersonalizedBannerData = {
      isManuallyRewarded: false,
      manualAllocatedPoints: undefined,
      manualBonusUsd: undefined,
      recommendedStakeGmx: undefined,
      estimatedRewardsUsd: undefined,
      hasPersonalizedData: false,
      isLoading,
    };

    if (!enabled || !dashboard || manualAllocatedPoints === undefined || gmxPrice === undefined || gmxPrice === 0n) {
      return noData;
    }

    const isManuallyRewarded = manualAllocatedPoints > 0n;

    if (isManuallyRewarded) {
      return {
        isManuallyRewarded: true,
        manualAllocatedPoints,
        manualBonusUsd: (manualAllocatedPoints * gmxPrice) / GMX_DECIMALS_FACTOR,
        recommendedStakeGmx: undefined,
        estimatedRewardsUsd: undefined,
        hasPersonalizedData: true,
        isLoading: false,
      };
    }

    const recentStats = dashboard.recentStats ?? [];
    const totalRecentVolume = recentStats.reduce((sum, s) => sum + s.tradedVolume, 0n);

    // Personalized staking/rewards calculation
    const gmxPriceNum = bigintToNumber(gmxPrice, USD_DECIMALS);
    if (gmxPriceNum <= 0) return noData;

    // W = wallet size in USD
    const W = walletUsd !== undefined ? bigintToNumber(walletUsd, USD_DECIMALS) : 0;

    // V90 = total traded volume over recent epochs
    const V90 = bigintToNumber(totalRecentVolume, USD_DECIMALS);

    // S = current GMX staked
    const S = stakingData?.gmxInStakedGmx !== undefined ? bigintToNumber(stakingData.gmxInStakedGmx, GMX_DECIMALS) : 0;

    // If user has zero wallet balance and zero volume, not enough data for personalization
    if (W <= 0 && V90 <= 0) {
      return noData;
    }

    // Derive parameters from backend config (with fallbacks)
    const epochsWindow = resolveEpochsWindow(config);
    const multCap = resolveMultiplierCap(config);
    const activityBoost = resolveActivityBoost(config);
    const maxStakeGmx = resolveMaxStakeGmx(config);
    const stakingTiers = resolveStakingTiers(config);
    const maxFeeDiscountFraction = MAX_FEE_DISCOUNT_PERCENT / 100;

    // 1) Volume potential
    const vHist = V90 / epochsWindow;
    const vWalletCap = W * ASSUMED_LEVERAGE * ASSUMED_COLLATERAL_TURNOVER;
    const vPotWeek = Math.min(vWalletCap, Math.max(vHist, 0.2 * vWalletCap) * MAX_GROWTH_VS_HISTORY);

    // 2) Staking potential
    const stakeBudgetUsd = STAKE_BUDGET_FRAC * W;
    const stakeCapGmx = gmxPriceNum > 0 ? stakeBudgetUsd / gmxPriceNum : 0;
    const sPot = Math.min(maxStakeGmx, Math.max(S, stakeCapGmx));

    // Recommended stake = sPot rounded to a nice display number
    const recommendedStakeGmx = roundToNice(sPot);

    // 3) Rewards estimate
    const stakeBonus = getStakingBonus(sPot, stakingTiers);
    const lifeBonus = 0; // life_bonus not available in banner context
    const mult = Math.min(multCap, 1.0 + stakeBonus + lifeBonus + activityBoost);
    const feesWeek = vPotWeek * INCENTIVES_FEE_RATE;
    const berryRate = Math.max(0, INCENTIVES_BASE_RATE * mult - REFERRAL_DISCOUNT);
    const berriesWeekUsd = feesWeek * berryRate;
    const feeSavingsWeek = Math.min(berriesWeekUsd, maxFeeDiscountFraction * feesWeek);

    // Only show personalized data if estimated rewards are meaningful (> $0.01)
    if (feeSavingsWeek < 0.01) {
      return noData;
    }

    return {
      isManuallyRewarded: false,
      manualAllocatedPoints: undefined,
      manualBonusUsd: undefined,
      recommendedStakeGmx,
      estimatedRewardsUsd: Math.round(feeSavingsWeek * 100) / 100,
      hasPersonalizedData: true,
      isLoading: false,
    };
  }, [
    enabled,
    dashboard,
    dashboardLoading,
    hasProgramStartTimestamp,
    manualAllocatedPoints,
    manualAllocatedPointsLoading,
    gmxPrice,
    walletUsd,
    stakingData,
    config,
  ]);
}

/**
 * Round a number to a "nice" human-readable value for display.
 * E.g. 347 -> 350, 4,123 -> 4,100, 78 -> 80
 */
function roundToNice(value: number): number {
  if (value <= 0) return 0;
  if (value < 10) return Math.round(value);

  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const scale = magnitude >= 100 ? magnitude / 10 : magnitude;
  return Math.round(value / scale) * scale;
}
