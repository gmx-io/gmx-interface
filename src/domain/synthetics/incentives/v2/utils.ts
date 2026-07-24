import { ONE_YEAR_SECONDS, SECONDS_IN_DAY } from "lib/dates";
import { formatAmount, formatUsd, PRECISION, USD_DECIMALS } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import { ES_GMX_DECIMALS, GT_DECIMALS } from "./constants";
import type { EstimatedTradeRewards } from "./tradeRewardEstimate";

export function formatEpochLabel(epochTimestamp: number, epochDuration: number, locale?: string): string {
  const safeEpochDuration = Math.max(epochDuration, 1);
  const start = new Date(epochTimestamp * 1000);
  const wholeDays = safeEpochDuration / SECONDS_IN_DAY;

  if (Number.isInteger(wholeDays) && wholeDays >= 1) {
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + wholeDays - 1);

    if (wholeDays === 1) {
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }).format(start);
    }

    if (safeEpochDuration < ONE_YEAR_SECONDS) {
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }).formatRange(start, endDate);
    }

    return new Intl.DateTimeFormat(locale, {
      month: "short",
      year: "numeric",
    }).formatRange(start, endDate);
  }

  const endInclusive = new Date((epochTimestamp + safeEpochDuration - 1) * 1000);

  if (safeEpochDuration < SECONDS_IN_DAY) {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).formatRange(start, endInclusive);
  }

  if (safeEpochDuration < ONE_YEAR_SECONDS) {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).formatRange(start, endInclusive);
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
  }).formatRange(start, endInclusive);
}

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

const RECENT_ACTIVITY_FEE_THRESHOLD_USD = 20n * PRECISION;
const NEW_TRADER_WINDOW_SECONDS = 14 * SECONDS_IN_DAY;

export function getRecentActivityRewardEstimateUsd({
  netPositionFeeUsd,
  firstTradeTimestamp,
  maxRewardRateFactor,
  nowSeconds = Math.floor(Date.now() / 1000),
}: {
  netPositionFeeUsd: bigint;
  firstTradeTimestamp?: number;
  maxRewardRateFactor: bigint;
  nowSeconds?: number;
}) {
  const hasEstablishedTradingHistory =
    firstTradeTimestamp !== undefined && nowSeconds - firstTradeTimestamp >= NEW_TRADER_WINDOW_SECONDS;

  if (!hasEstablishedTradingHistory || netPositionFeeUsd < RECENT_ACTIVITY_FEE_THRESHOLD_USD) {
    return undefined;
  }

  return bigMath.mulDiv(netPositionFeeUsd, maxRewardRateFactor, PRECISION);
}

export function getRewardsHistoryStatus(epoch: number, epochDuration: number, nowSeconds = Date.now() / 1000) {
  return nowSeconds < epoch + epochDuration ? ("ongoing" as const) : ("finished" as const);
}

export function formatManualAllocationVolumeRange(minVolume: bigint, maxVolume: bigint | null) {
  const minimum = formatUsd(minVolume, { displayDecimals: 0 }) ?? "-";

  if (maxVolume === null) return `${minimum}+`;

  return `${minimum} – ${formatUsd(maxVolume, { displayDecimals: 0 }) ?? "-"}`;
}

export function formatRewardUsd(value: bigint, displayDecimals = 0) {
  if (value > 0n && value < PRECISION) return "< $1";

  return formatUsd(value, { displayDecimals }) ?? "-";
}

export function formatEstimatedTradeRewards(rewards: EstimatedTradeRewards) {
  if (rewards.esGmxRewards !== undefined && rewards.gtRewards !== undefined) {
    const esGmxRewards = formatAmount(rewards.esGmxRewards, ES_GMX_DECIMALS, 4, true, {
      trimTrailingZeros: true,
    });
    const gtRewards = formatAmount(rewards.gtRewards, GT_DECIMALS, 4, true, {
      trimTrailingZeros: true,
    });

    return `${esGmxRewards} esGMX + ${gtRewards} GT`;
  }

  return formatUsd(rewards.rewardsUsd, { displayDecimals: 2 }) ?? "-";
}
