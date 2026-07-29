import { convertToTokenAmount } from "domain/synthetics/tokens";
import { applyFactor, PRECISION } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import { ES_GMX_DECIMALS, GT_DECIMALS } from "./constants";
import type { AccountIncentiveStatus, BoostId, IncentivesConfig, StakingTierId, VolumeTierId } from "./types";

export type TradeMultiplierParams = {
  config: IncentivesConfig;
  status: AccountIncentiveStatus;
  sizeDeltaUsd: bigint;
  indexTokenAddress: string;
  isIncrease: boolean;
  balanceWasImproved: boolean;
};

export type TradeMultiplierEstimate = {
  normalMultiplier: bigint;
  fullMultiplier: bigint;
  effectiveMultiplier: bigint;
  manualMultiplier: bigint;
};

export type TradeRewardEstimateParams = TradeMultiplierParams & {
  positionFeeUsd: bigint;
  totalRebateFactor?: bigint;
  gmxPrice?: bigint;
  gtPrice?: bigint;
};

export type EstimatedTradeRewards = TradeMultiplierEstimate & {
  eligibleFeeUsd: bigint;
  baseRewardUsd: bigint;
  esGmxRewardsUsd: bigint;
  gtRewardsUsd: bigint;
  rewardsUsd: bigint;
  manualRewardsUsd: bigint;
  esGmxRewards?: bigint;
  gtRewards?: bigint;
};

export function getEstimatedTradeRewards(params: TradeRewardEstimateParams): EstimatedTradeRewards {
  const multiplierEstimate = getTradeMultiplierEstimate(params);
  const { config, positionFeeUsd, totalRebateFactor = 0n, gmxPrice, gtPrice } = params;
  const positivePositionFeeUsd = positionFeeUsd > 0n ? positionFeeUsd : 0n;
  const rebateUsd = applyFactor(positivePositionFeeUsd, totalRebateFactor);
  const eligibleFeeUsd = positivePositionFeeUsd > rebateUsd ? positivePositionFeeUsd - rebateUsd : 0n;
  const normalBaseRewardUsd = getBaseRewardUsd(eligibleFeeUsd, multiplierEstimate.normalMultiplier, config);
  const fullBaseRewardUsd = getBaseRewardUsd(eligibleFeeUsd, multiplierEstimate.fullMultiplier, config);
  const availableManualBaseRewardUsd = fullBaseRewardUsd - normalBaseRewardUsd;
  let manualBaseRewardUsd = availableManualBaseRewardUsd;
  let manualRewardsUsd = getCombinedRewardUsd(manualBaseRewardUsd, config);

  if (manualRewardsUsd > params.status.manualRewardRemainingUsd) {
    const combinedShareFactor = config.esGmxShareFactor + config.gtShareFactor;
    const allowedManualBaseRewardUsd =
      combinedShareFactor > 0n
        ? bigMath.mulDiv(params.status.manualRewardRemainingUsd, PRECISION, combinedShareFactor)
        : 0n;
    manualBaseRewardUsd =
      availableManualBaseRewardUsd < allowedManualBaseRewardUsd
        ? availableManualBaseRewardUsd
        : allowedManualBaseRewardUsd;
    manualRewardsUsd = getCombinedRewardUsd(manualBaseRewardUsd, config);
  }

  const baseRewardUsd = normalBaseRewardUsd + manualBaseRewardUsd;
  const availableManualMultiplier = multiplierEstimate.fullMultiplier - multiplierEstimate.normalMultiplier;
  const manualMultiplier =
    manualBaseRewardUsd > 0n && availableManualBaseRewardUsd > 0n
      ? bigMath.mulDiv(availableManualMultiplier, manualBaseRewardUsd, availableManualBaseRewardUsd)
      : 0n;
  const effectiveMultiplier = multiplierEstimate.normalMultiplier + manualMultiplier;
  const esGmxRewardsUsd = applyFactor(baseRewardUsd, config.esGmxShareFactor);
  const gtRewardsUsd = applyFactor(baseRewardUsd, config.gtShareFactor);

  return {
    ...multiplierEstimate,
    effectiveMultiplier,
    manualMultiplier,
    eligibleFeeUsd,
    baseRewardUsd,
    esGmxRewardsUsd,
    gtRewardsUsd,
    rewardsUsd: esGmxRewardsUsd + gtRewardsUsd,
    manualRewardsUsd,
    esGmxRewards: esGmxRewardsUsd === 0n ? 0n : convertToTokenAmount(esGmxRewardsUsd, ES_GMX_DECIMALS, gmxPrice),
    gtRewards: gtRewardsUsd === 0n ? 0n : convertToTokenAmount(gtRewardsUsd, GT_DECIMALS, gtPrice),
  };
}

export function getTradeMultiplierEstimate(params: TradeMultiplierParams): TradeMultiplierEstimate {
  const { config, status } = params;

  if (config.multiplierDecimals <= 0n || config.maxMultiplier <= 0n) {
    return {
      normalMultiplier: 0n,
      fullMultiplier: 0n,
      effectiveMultiplier: 0n,
      manualMultiplier: 0n,
    };
  }

  const volumeMultiplier = getVolumeTierMultiplier(config, status.volumeTier);
  const stakingMultiplier = getStakingTierMultiplier(config, status.stakingTier);
  const lifetimeMultiplier = status.boostIds.includes("LifetimeTrading")
    ? getBoostMultiplier(config, "LifetimeTrading")
    : 0n;
  const featuredMultiplier = config.featuredMarketIndexTokens.includes(params.indexTokenAddress)
    ? getBoostMultiplier(config, "FeaturedMarkets")
    : 0n;
  const balancingMultiplier =
    params.isIncrease && params.sizeDeltaUsd >= config.balancingTradesThreshold && params.balanceWasImproved
      ? getBoostMultiplier(config, "BalancingTrades")
      : 0n;
  const perTradeMultiplier = featuredMultiplier + balancingMultiplier;
  const persistentWithoutManual = volumeMultiplier + stakingMultiplier + lifetimeMultiplier;
  const manualAdjustment = status.boostIds.includes("ManualAllocation")
    ? getBoostMultiplier(config, "ManualAllocation")
    : 0n;
  const normalMultiplier = bigMath.min(persistentWithoutManual + perTradeMultiplier, config.maxMultiplier);
  const fullMultiplier = bigMath.min(
    persistentWithoutManual + manualAdjustment + perTradeMultiplier,
    config.maxMultiplier
  );

  return {
    normalMultiplier,
    fullMultiplier,
    effectiveMultiplier: fullMultiplier,
    manualMultiplier: fullMultiplier - normalMultiplier,
  };
}

function getVolumeTierMultiplier(config: IncentivesConfig, tier: VolumeTierId | null) {
  return config.volumeTiers.find((item) => item.tier === tier)?.multiplier ?? 0n;
}

function getStakingTierMultiplier(config: IncentivesConfig, tier: StakingTierId | null) {
  return config.stakingTiers.find((item) => item.tier === tier)?.multiplier ?? 0n;
}

function getBoostMultiplier(config: IncentivesConfig, boost: BoostId) {
  return config.boosts.find((item) => item.boost === boost)?.multiplier ?? 0n;
}

function getBaseRewardUsd(feeUsd: bigint, multiplier: bigint, config: IncentivesConfig) {
  if (feeUsd <= 0n || multiplier <= 0n || config.multiplierDecimals <= 0n) return 0n;

  return applyFactor(bigMath.mulDiv(feeUsd, multiplier, config.multiplierDecimals), config.feeShareFactor);
}

function getCombinedRewardUsd(baseRewardUsd: bigint, config: IncentivesConfig) {
  return applyFactor(baseRewardUsd, config.esGmxShareFactor) + applyFactor(baseRewardUsd, config.gtShareFactor);
}
