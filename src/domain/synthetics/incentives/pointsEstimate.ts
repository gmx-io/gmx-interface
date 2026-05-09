import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { MAX_FEE_DISCOUNT_PERCENT, MULTIPLIER_DECIMALS } from "domain/synthetics/incentives/constants";
import { bigMath } from "sdk/utils/bigmath";

const BASE_POINTS_RATE_BPS = 1000n;
const GMX_DECIMALS_FACTOR = 10n ** 18n;
export const DOWNGRADING_COEFFICIENT_DECIMALS = 2;
export const DEFAULT_DOWNGRADING_COEFFICIENT = 10n ** BigInt(DOWNGRADING_COEFFICIENT_DECIMALS);

export type EstimatedRewardsParams = {
  feeUsd?: bigint;
  multiplier?: number;
  multiplierDecimals?: number;
  totalRebate?: bigint;
  discountShare?: bigint;
  gmxPrice?: bigint;
  downgradingCoefficient?: bigint;
};

export function getEstimatedTradeRewards({
  feeUsd,
  multiplier,
  multiplierDecimals = MULTIPLIER_DECIMALS,
  totalRebate,
  gmxPrice,
  downgradingCoefficient,
}: EstimatedRewardsParams) {
  if (feeUsd === undefined || feeUsd <= 0n || multiplier === undefined || multiplier <= 0 || multiplierDecimals <= 0) {
    return undefined;
  }

  const rebateBps = totalRebate ?? 0n;
  const eligibleFeeUsd =
    rebateBps > 0n && rebateBps < BASIS_POINTS_DIVISOR_BIGINT
      ? bigMath.mulDiv(feeUsd, BASIS_POINTS_DIVISOR_BIGINT - rebateBps, BASIS_POINTS_DIVISOR_BIGINT)
      : rebateBps >= BASIS_POINTS_DIVISOR_BIGINT
        ? 0n
        : feeUsd;

  if (eligibleFeeUsd <= 0n) {
    return undefined;
  }

  const effectiveDowngradingCoefficient =
    downgradingCoefficient !== undefined && downgradingCoefficient < DEFAULT_DOWNGRADING_COEFFICIENT
      ? downgradingCoefficient
      : DEFAULT_DOWNGRADING_COEFFICIENT;
  const downgradedEligibleFeeUsd = bigMath.mulDiv(
    eligibleFeeUsd,
    effectiveDowngradingCoefficient,
    DEFAULT_DOWNGRADING_COEFFICIENT
  );

  if (downgradedEligibleFeeUsd <= 0n) {
    return undefined;
  }

  const boostedRewardBps = bigMath.mulDiv(BASE_POINTS_RATE_BPS, BigInt(multiplier), BigInt(multiplierDecimals));

  if (boostedRewardBps <= 0n) {
    return undefined;
  }

  const uncappedRewardsUsd = bigMath.mulDiv(downgradedEligibleFeeUsd, boostedRewardBps, BASIS_POINTS_DIVISOR_BIGINT);

  // Cap rewards at MAX_FEE_DISCOUNT_PERCENT of the fee to match on-chain enforcement.
  const maxRewardsUsd = bigMath.mulDiv(feeUsd, BigInt(MAX_FEE_DISCOUNT_PERCENT), 100n);
  const rewardsUsd = uncappedRewardsUsd > maxRewardsUsd ? maxRewardsUsd : uncappedRewardsUsd;

  return {
    rewardsUsd,
    rewardsGmx:
      gmxPrice !== undefined && gmxPrice > 0n ? bigMath.mulDiv(rewardsUsd, GMX_DECIMALS_FACTOR, gmxPrice) : undefined,
  };
}

export function getMarketDowngradingCoefficient(
  downgradingCoefficients: Record<string, bigint> | undefined,
  marketAddress: string | undefined
) {
  if (!downgradingCoefficients || !marketAddress) {
    return undefined;
  }

  const exactCoefficient =
    downgradingCoefficients[marketAddress] ?? downgradingCoefficients[marketAddress.toLowerCase()];

  if (exactCoefficient !== undefined) {
    return exactCoefficient;
  }

  const normalizedMarketAddress = marketAddress.toLowerCase();
  return Object.entries(downgradingCoefficients).find(
    ([address]) => address.toLowerCase() === normalizedMarketAddress
  )?.[1];
}
