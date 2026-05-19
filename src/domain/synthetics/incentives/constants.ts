import { t } from "@lingui/macro";

import { ARBITRUM } from "config/chains";

import type { BoostId, StakingTierId, VolumeTierId } from "./types";

export const VOLUME_TIER_BADGES: Record<VolumeTierId, () => string> = {
  Tier1: () => t`Ranked`,
  Tier2: () => t`Certified`,
  Tier3: () => t`Veteran`,
  Tier4: () => t`Legendary`,
  Tier5: () => t`Apex`,
};

export const STAKING_TIER_BADGES: Record<StakingTierId, () => string> = {
  Tier1: () => t`Supporter`,
  Tier2: () => t`Advocate`,
  Tier3: () => t`Guardian`,
  Tier4: () => t`Steward`,
  Tier5: () => t`Titan`,
};

export const BOOST_LABELS: Record<BoostId, () => string> = {
  FeaturedMarkets: () => t`Featured Markets`,
  BalancingTrades: () => t`Balancing Trades`,
  LifetimeTrading: () => t`Lifetime Volume`,
};

export const BOOST_DESCRIPTIONS: Record<BoostId, () => string> = {
  FeaturedMarkets: () => t`Trade featured or new markets to earn this boost`,
  BalancingTrades: () => t`Place balancing trades ($1M+) on under-utilized sides`,
  LifetimeTrading: () => t`Achieve $200M+ lifetime trading volume`,
};

const INCENTIVES_ENABLED_CHAINS = [ARBITRUM];

export function isIncentivesEnabled(chainId: number): boolean {
  return INCENTIVES_ENABLED_CHAINS.includes(chainId);
}

export const MULTIPLIER_DECIMALS = 100;
export const MAX_MULTIPLIER = 400;
export const MAX_FEE_DISCOUNT_PERCENT = 50;
export const POINTS_EXPIRATION_EPOCHS = 13;
export const VOLUME_TIER_PERSISTENCE_EPOCHS = 4;
export const GMX_DECIMALS = 18;
export const GMX_DECIMALS_FACTOR = 10n ** BigInt(GMX_DECIMALS);

/** Incentives reward modelling constants — shared across banners / tier cards. */
export const INCENTIVES_FEE_RATE = 0.0005; // open + close fee share of volume
export const INCENTIVES_BASE_RATE = 0.1; // 10% of eligible fees
const DEFAULT_EPOCH_DURATION = 7 * 24 * 60 * 60; // 1 week fallback

export function getEpochDuration(config?: { epochDuration: number }): number {
  return config?.epochDuration ?? DEFAULT_EPOCH_DURATION;
}

export function getVolumeTierBadge(tier: string): string {
  return VOLUME_TIER_BADGES[tier as VolumeTierId]?.() ?? tier;
}

export function getStakingTierBadge(tier: string): string {
  return STAKING_TIER_BADGES[tier as StakingTierId]?.() ?? tier;
}

export function getBoostLabel(boost: string): string {
  return BOOST_LABELS[boost as BoostId]?.() ?? boost;
}
