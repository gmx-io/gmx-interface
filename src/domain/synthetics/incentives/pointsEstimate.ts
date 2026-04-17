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
  gmxPrice,
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

  const boostedRewardBps = bigMath.mulDiv(BASE_POINTS_RATE_BPS, BigInt(multiplier), BigInt(multiplierDecimals));

  if (boostedRewardBps <= 0n) {
    return undefined;
  }

  const rewardsUsd = bigMath.mulDiv(eligibleFeeUsd, boostedRewardBps, BASIS_POINTS_DIVISOR_BIGINT);

  return {
    rewardsUsd,
    rewardsGmx:
      gmxPrice !== undefined && gmxPrice > 0n ? bigMath.mulDiv(rewardsUsd, GMX_DECIMALS_FACTOR, gmxPrice) : undefined,
  };
}
