import { applyFactor } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import { getBaseRewardUsd } from "./rewardCalculation";
import type { BoostId, IncentivesConfig } from "./types";

export function getLandingRewardEstimate({
  config,
  volumeUsd,
  stakedAmount,
  boosts,
}: {
  config: IncentivesConfig;
  volumeUsd: bigint;
  stakedAmount: bigint;
  boosts: BoostId[];
}) {
  const volumeMultiplier = getTierMultiplier(config.volumeTiers, volumeUsd);
  const stakingMultiplier = getTierMultiplier(config.stakingTiers, stakedAmount);
  const boostMultipliers = config.boosts.filter(({ boost }) => boosts.includes(boost));
  const uncappedMultiplier = boostMultipliers.reduce(
    (sum, { multiplier }) => sum + multiplier,
    volumeMultiplier + stakingMultiplier
  );
  const multiplier = bigMath.min(uncappedMultiplier, config.maxMultiplier);
  const feesUsd = getLandingTradingFeesUsd(volumeUsd);
  const baseRewardUsd = getBaseRewardUsd(feesUsd, multiplier, config);
  const esGmxRewardsUsd = applyFactor(baseRewardUsd, config.esGmxShareFactor);
  const gtRewardsUsd = applyFactor(baseRewardUsd, config.gtShareFactor);

  return {
    feesUsd,
    volumeMultiplier,
    stakingMultiplier,
    boostMultipliers,
    multiplier,
    isCapped: uncappedMultiplier > multiplier,
    esGmxRewardsUsd,
    gtRewardsUsd,
    rewardsUsd: esGmxRewardsUsd + gtRewardsUsd,
  };
}

export function getLandingTradingFeesUsd(volumeUsd: bigint) {
  // The landing calculator estimates fees at a 0.05% rate.
  return bigMath.max(volumeUsd, 0n) / 2000n;
}

function getTierMultiplier(tiers: { threshold: bigint; multiplier: bigint }[], amount: bigint) {
  return tiers.reduce(
    (multiplier, tier) => (amount >= tier.threshold ? bigMath.max(multiplier, tier.multiplier) : multiplier),
    0n
  );
}
