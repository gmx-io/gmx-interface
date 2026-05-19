import { t } from "@lingui/macro";

import {
  MAX_MULTIPLIER,
  POINTS_EXPIRATION_EPOCHS,
  VOLUME_TIER_PERSISTENCE_EPOCHS,
} from "domain/synthetics/incentives/constants";
import type { BoostId, IncentivesConfig } from "domain/synthetics/incentives/types";
import { formatMultiplier } from "domain/synthetics/incentives/utils";
import { formatAmountHuman } from "lib/numbers";

const USD_DECIMALS = 30;

function formatCompactUsdThreshold(threshold: bigint): string {
  return `$${formatAmountHuman(threshold, USD_DECIMALS, false, 0)}+`;
}

export function getBoostDescription(boostId: BoostId, config?: IncentivesConfig): string {
  if (boostId === "BalancingTrades") {
    const thresholdLabel = config?.balancingTradesThreshold
      ? formatCompactUsdThreshold(config.balancingTradesThreshold)
      : undefined;

    return thresholdLabel
      ? t`Place balancing trades (${thresholdLabel}) on underutilized sides to earn an additional multiplier on those trades.`
      : t`Place balancing trades on underutilized sides to earn an additional multiplier on those trades.`;
  }

  if (boostId === "LifetimeTrading") {
    const thresholdLabel = config?.lifetimeVolumeThreshold
      ? formatCompactUsdThreshold(config.lifetimeVolumeThreshold)
      : undefined;

    return thresholdLabel
      ? t`Reach ${thresholdLabel} in lifetime trading volume to unlock a permanent 1× multiplier.`
      : t`Reach a lifetime trading volume milestone to unlock a permanent 1× multiplier.`;
  }

  return t`Trade featured markets to activate this boost and earn a higher multiplier for those trades.`;
}

export function getMaxMultiplierLabel(config?: IncentivesConfig): string {
  return formatMultiplier(config?.maxMultiplier ?? MAX_MULTIPLIER);
}

export function getPointsExpirationEpochs(config?: IncentivesConfig): number {
  return config?.pointsExpirationEpochs ?? POINTS_EXPIRATION_EPOCHS;
}

export function getVolumeTierPersistenceEpochs(config?: IncentivesConfig): number {
  return config?.volumeTierPersistenceEpochs ?? VOLUME_TIER_PERSISTENCE_EPOCHS;
}
