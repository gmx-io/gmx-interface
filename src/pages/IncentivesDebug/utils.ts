import type { BoostId, StakingTierId, VolumeTierId } from "domain/synthetics/incentives/v2/types";
import { formatMultiplier } from "domain/synthetics/incentives/v2/utils";

const volumeTierNames: Record<VolumeTierId, string> = {
  Tier1: "Tier1 · Ranked",
  Tier2: "Tier2 · Certified",
  Tier3: "Tier3 · Veteran",
  Tier4: "Tier4 · Legendary",
  Tier5: "Tier5 · Apex",
};

const stakingTierNames: Record<StakingTierId, string> = {
  Tier1: "Tier1 · Supporter",
  Tier2: "Tier2 · Advocate",
  Tier3: "Tier3 · Guardian",
  Tier4: "Tier4 · Steward",
  Tier5: "Tier5 · Titan",
};

const boostNames: Record<BoostId, string> = {
  FeaturedMarkets: "FeaturedMarkets",
  BalancingTrades: "BalancingTrades",
  LifetimeTrading: "LifetimeTrading",
  ManualAllocation: "ManualAllocation",
};

export function formatAuditMultiplier(multiplier: number, multiplierDecimals: bigint) {
  if (!Number.isSafeInteger(multiplier)) return "-";

  return formatMultiplier(BigInt(multiplier), multiplierDecimals);
}

export function formatEffectiveRewardsRatio(ratio: number) {
  if (!Number.isFinite(ratio)) return "-";

  return `${(ratio * 100).toFixed(2)}%`;
}

export function formatVolumeTier(tier: VolumeTierId | null) {
  return tier ? volumeTierNames[tier] : "-";
}

export function formatStakingTier(tier: StakingTierId | null) {
  return tier ? stakingTierNames[tier] : "-";
}

export function formatBoosts(boostIds: BoostId[]) {
  return boostIds.length ? boostIds.map((boost) => boostNames[boost]).join(", ") : "-";
}
