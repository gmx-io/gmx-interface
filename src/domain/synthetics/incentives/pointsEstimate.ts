import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { MULTIPLIER_DECIMALS } from "domain/synthetics/incentives/constants";
import { bigMath } from "sdk/utils/bigmath";

const BASE_POINTS_RATE_BPS = 1000n;
const GMX_DECIMALS_FACTOR = 10n ** 18n;

export type EstimatedRewardsParams = {
  feeUsd?: bigint;
  multiplier?: number;
  multiplierDecimals?: number;
  totalRebate?: bigint;
  discountShare?: bigint;
  gmxPrice?: bigint;
};

export function getEstimatedTradeRewards({
  feeUsd,
  multiplier,
  multiplierDecimals = MULTIPLIER_DECIMALS,
  totalRebate,
  discountShare,
  gmxPrice,
}: EstimatedRewardsParams) {
  if (feeUsd === undefined || feeUsd <= 0n || multiplier === undefined || multiplier <= 0 || multiplierDecimals <= 0) {
    return undefined;
  }

  const boostedRewardBps = bigMath.mulDiv(BASE_POINTS_RATE_BPS, BigInt(multiplier), BigInt(multiplierDecimals));
  const referralDiscountBps =
    totalRebate !== undefined && discountShare !== undefined
      ? bigMath.mulDiv(totalRebate, discountShare, BASIS_POINTS_DIVISOR_BIGINT)
      : 0n;
  const effectiveRewardBps = boostedRewardBps > referralDiscountBps ? boostedRewardBps - referralDiscountBps : 0n;

  if (effectiveRewardBps <= 0n) {
    return undefined;
  }

  const rewardsUsd = bigMath.mulDiv(feeUsd, effectiveRewardBps, BASIS_POINTS_DIVISOR_BIGINT);

  return {
    rewardsUsd,
    rewardsGmx:
      gmxPrice !== undefined && gmxPrice > 0n ? bigMath.mulDiv(rewardsUsd, GMX_DECIMALS_FACTOR, gmxPrice) : undefined,
  };
}
