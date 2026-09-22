import { formatAmount, PRECISION, USD_DECIMALS } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

export function formatMultiplier(multiplier: bigint, multiplierDecimals: bigint, displayDecimals = 2) {
  if (multiplierDecimals <= 0n) return "-";

  const displayPrecision = 10n ** BigInt(displayDecimals);
  const scaledMultiplier = (multiplier * displayPrecision + multiplierDecimals / 2n) / multiplierDecimals;
  const formatted = formatAmount(scaledMultiplier, displayDecimals, displayDecimals, false, {
    trimTrailingZeros: true,
  });

  return `${formatted}x`;
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
