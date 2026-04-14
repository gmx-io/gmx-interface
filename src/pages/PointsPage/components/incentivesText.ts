import { t } from "@lingui/macro";

import {
  MAX_MULTIPLIER,
  POINTS_EXPIRATION_EPOCHS,
  VOLUME_TIER_PERSISTENCE_EPOCHS,
  formatMultiplier,
} from "domain/synthetics/incentives/constants";
import type { BoostId, IncentivesConfig } from "domain/synthetics/incentives/types";
import { formatAmount } from "lib/numbers";

const USD_DECIMALS = 30;

export function getBoostDescription(boostId: BoostId, config?: IncentivesConfig): string {
  if (boostId === "BalancingTrades") {
    const thresholdLabel = config?.balancingTradesThreshold
      ? `$${formatAmount(config.balancingTradesThreshold, USD_DECIMALS, 0, true)}+`
      : undefined;

    return thresholdLabel
      ? t`Place balancing trades (${thresholdLabel}) on under-utilized sides`
      : t`Place balancing trades on under-utilized sides`;
  }

  if (boostId === "LifetimeTrading") {
    const thresholdLabel = config?.lifetimeVolumeThreshold
      ? `$${formatAmount(config.lifetimeVolumeThreshold, USD_DECIMALS, 0, true)}+`
      : undefined;

    return thresholdLabel
      ? t`Achieve ${thresholdLabel} lifetime trading volume`
      : t`Achieve a lifetime trading volume milestone`;
  }

  return t`Trade featured or new markets to earn this boost`;
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
