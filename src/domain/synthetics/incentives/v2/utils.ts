import { formatAmount, PRECISION, USD_DECIMALS } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import type { IncentivesConfig } from "./types";

export function getPreviousEpochRewardBreakdown(
  rewardsUsd: bigint,
  config: Pick<
    IncentivesConfig,
    "epochTimestamp" | "epochStartTimestamp" | "epochDuration" | "esGmxShareFactor" | "gtShareFactor"
  >
) {
  // The current shares are only valid for epochs covered by this config version.
  if (config.epochTimestamp - config.epochDuration < config.epochStartTimestamp) return undefined;

  const combinedShare = config.esGmxShareFactor + config.gtShareFactor;
  if (combinedShare <= 0n) return undefined;

  const esGmxUsd = bigMath.mulDiv(rewardsUsd, config.esGmxShareFactor, combinedShare);

  return { esGmxUsd, gtUsd: rewardsUsd - esGmxUsd };
}

export function formatMultiplier(
  multiplier: bigint,
  multiplierDecimals: bigint,
  displayDecimals = 2,
  maxMultiplier?: bigint
) {
  if (multiplierDecimals <= 0n) return "-";

  const displayPrecision = 10n ** BigInt(displayDecimals);
  const scaledMultiplier = (multiplier * displayPrecision + multiplierDecimals / 2n) / multiplierDecimals;
  const formatted = formatAmount(scaledMultiplier, displayDecimals, displayDecimals, false, {
    trimTrailingZeros: true,
  });

  const roundsToMaximum =
    maxMultiplier !== undefined &&
    multiplier < maxMultiplier &&
    scaledMultiplier * multiplierDecimals >= maxMultiplier * displayPrecision;

  return `${roundsToMaximum ? "<" : ""}${formatted}x`;
}

export function formatMultiplierAdjustment(multiplier: bigint, multiplierDecimals: bigint, displayDecimals = 2) {
  const formatted = formatMultiplier(multiplier, multiplierDecimals, displayDecimals);

  return multiplier > 0n && formatted !== "-" ? `+${formatted}` : formatted;
}

export function formatFactorPercentage(factor: bigint, displayDecimals = 0) {
  return `${formatAmount(factor * 100n, USD_DECIMALS, displayDecimals, false, {
    trimTrailingZeros: true,
  })}%`;
}

export function getMaxRewardRateFactor(config: {
  feeShareFactor: bigint;
  esGmxShareFactor: bigint;
  gtShareFactor: bigint;
  maxMultiplier: bigint;
  multiplierDecimals: bigint;
}) {
  if (config.multiplierDecimals <= 0n) return 0n;

  const combinedTokenShareFactor = config.esGmxShareFactor + config.gtShareFactor;
  const rewardShareFactor = bigMath.mulDiv(config.feeShareFactor, combinedTokenShareFactor, PRECISION);

  return bigMath.mulDiv(rewardShareFactor, config.maxMultiplier, config.multiplierDecimals);
}
