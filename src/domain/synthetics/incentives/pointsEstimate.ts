import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { GMX_DECIMALS, MAX_FEE_DISCOUNT_PERCENT, MULTIPLIER_DECIMALS } from "domain/synthetics/incentives/constants";
import { bigMath } from "sdk/utils/bigmath";
import { getOpenInterestForBalance } from "sdk/utils/markets";
import type { MarketInfo } from "sdk/utils/markets/types";
import { convertToTokenAmount, convertToUsd } from "sdk/utils/tokens";

import type { BoostConfig, BoostId } from "./types";

const BASE_POINTS_RATE_BPS = 1000n;
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

export type EstimatedFeeRewardsParams = {
  feeUsd?: bigint;
  totalRebate?: bigint;
  discountShare?: bigint;
  pointsBalance?: bigint;
  gmxPrice?: bigint;
};

export type EffectiveTradeMultiplierParams = {
  multiplier?: number;
  maxMultiplier?: number;
  boosts?: BoostConfig[];
  featuredMarketTokens?: string[];
  marketInfo?: MarketInfo;
  isLong?: boolean;
  sizeDeltaUsd?: bigint;
  balancingTradesThreshold?: bigint;
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
    rewardsGmx: convertToTokenAmount(rewardsUsd, GMX_DECIMALS, gmxPrice),
  };
}

export function getEstimatedFeeRewards({
  feeUsd,
  totalRebate,
  discountShare,
  pointsBalance,
  gmxPrice,
}: EstimatedFeeRewardsParams) {
  if (feeUsd === undefined || feeUsd <= 0n || pointsBalance === undefined || pointsBalance <= 0n) {
    return undefined;
  }

  if (gmxPrice === undefined || gmxPrice <= 0n) {
    return undefined;
  }

  const totalRebateUsd =
    totalRebate !== undefined && totalRebate > 0n
      ? bigMath.mulDiv(feeUsd, totalRebate, BASIS_POINTS_DIVISOR_BIGINT)
      : 0n;
  const affiliateShare =
    discountShare !== undefined && discountShare < BASIS_POINTS_DIVISOR_BIGINT
      ? BASIS_POINTS_DIVISOR_BIGINT - discountShare
      : 0n;
  const affiliateRebateUsd =
    totalRebateUsd > 0n && affiliateShare > 0n
      ? bigMath.mulDiv(totalRebateUsd, affiliateShare, BASIS_POINTS_DIVISOR_BIGINT)
      : 0n;
  const eligibleFeeUsd = feeUsd > affiliateRebateUsd ? feeUsd - affiliateRebateUsd : 0n;

  if (eligibleFeeUsd <= 0n) {
    return undefined;
  }

  const maxRewardsUsd = bigMath.mulDiv(eligibleFeeUsd, BigInt(MAX_FEE_DISCOUNT_PERCENT), 100n);
  const pointsBalanceUsd = convertToUsd(pointsBalance, GMX_DECIMALS, gmxPrice) ?? 0n;
  const rewardsUsd = maxRewardsUsd > pointsBalanceUsd ? pointsBalanceUsd : maxRewardsUsd;

  if (rewardsUsd <= 0n) {
    return undefined;
  }

  return {
    rewardsUsd,
    rewardsBasisUsd: eligibleFeeUsd,
  };
}

export function getEffectiveTradeMultiplier({
  multiplier,
  maxMultiplier,
  boosts,
  featuredMarketTokens,
  marketInfo,
  isLong,
  sizeDeltaUsd,
  balancingTradesThreshold,
}: EffectiveTradeMultiplierParams) {
  const baseMultiplier = toFiniteNumber(multiplier);

  if (baseMultiplier === undefined || baseMultiplier <= 0) {
    return baseMultiplier;
  }

  let effectiveMultiplier = baseMultiplier;

  if (getIsFeaturedMarket(featuredMarketTokens, marketInfo?.marketTokenAddress)) {
    effectiveMultiplier += getBoostMultiplier(boosts, "FeaturedMarkets");
  }

  if (
    getIsBalancingTrade({
      marketInfo,
      isLong,
      sizeDeltaUsd,
      balancingTradesThreshold,
    })
  ) {
    effectiveMultiplier += getBoostMultiplier(boosts, "BalancingTrades");
  }

  const maxMultiplierNumber = toFiniteNumber(maxMultiplier);

  if (maxMultiplierNumber !== undefined && maxMultiplierNumber > 0) {
    return Math.min(effectiveMultiplier, maxMultiplierNumber);
  }

  return effectiveMultiplier;
}

function getBoostMultiplier(boosts: BoostConfig[] | undefined, boostId: BoostId) {
  return toFiniteNumber(boosts?.find((boost) => boost.boost === boostId)?.multiplier) ?? 0;
}

function toFiniteNumber(value: number | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

export function getIsFeaturedMarket(featuredMarketTokens: string[] | undefined, marketAddress: string | undefined) {
  if (!featuredMarketTokens?.length || !marketAddress) {
    return false;
  }

  const normalizedMarketAddress = marketAddress.toLowerCase();
  return featuredMarketTokens.some(
    (featuredMarketAddress) => featuredMarketAddress.toLowerCase() === normalizedMarketAddress
  );
}

export function getIsBalancingTrade({
  marketInfo,
  isLong,
  sizeDeltaUsd,
  balancingTradesThreshold,
}: {
  marketInfo?: MarketInfo;
  isLong?: boolean;
  sizeDeltaUsd?: bigint;
  balancingTradesThreshold?: bigint;
}) {
  if (!marketInfo || isLong === undefined || sizeDeltaUsd === undefined || sizeDeltaUsd <= 0n) {
    return false;
  }

  if (balancingTradesThreshold !== undefined && sizeDeltaUsd < balancingTradesThreshold) {
    return false;
  }

  const currentLongUsd = getOpenInterestForBalance(marketInfo, true);
  const currentShortUsd = getOpenInterestForBalance(marketInfo, false);
  const nextLongUsd = isLong ? currentLongUsd + sizeDeltaUsd : currentLongUsd;
  const nextShortUsd = isLong ? currentShortUsd : currentShortUsd + sizeDeltaUsd;

  return bigMath.abs(nextLongUsd - nextShortUsd) < bigMath.abs(currentLongUsd - currentShortUsd);
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
