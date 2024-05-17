import { BN_ZERO } from "lib/numbers";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";

import { useMaxBoostBasicPoints } from "domain/rewards/useMaxBoostBasisPoints";
import { bigMath } from "lib/bigmath";

export function useRecommendStakeGmxAmount(
  p: {
    accumulatedGMX?: bigint;
    accumulatedBnGMX?: bigint;
    accumulatedEsGMX?: bigint;
    stakedGMX?: bigint;
    stakedBnGMX?: bigint;
    stakedEsGMX?: bigint;
  },
  conditions: {
    shouldStakeGmx?: boolean;
    shouldStakeEsGmx?: boolean;
  }
) {
  const maxBoostBasicPoints = useMaxBoostBasicPoints();

  const accumulatedGMX = p.accumulatedGMX ?? BN_ZERO;
  const accumulatedBnGMX = p.accumulatedBnGMX ?? BN_ZERO;
  const accumulatedEsGMX = p.accumulatedEsGMX ?? BN_ZERO;
  const stakedGMX = p.stakedGMX ?? BN_ZERO;
  const stakedBnGMX = p.stakedBnGMX ?? BN_ZERO;
  const stakedEsGMX = p.stakedEsGMX ?? BN_ZERO;

  const nextTotalBnGMX = stakedBnGMX + accumulatedBnGMX;
  let nextTotalGmx = stakedGMX + stakedEsGMX;

  if (conditions.shouldStakeGmx) {
    nextTotalGmx = nextTotalGmx + accumulatedGMX;
  }

  if (conditions.shouldStakeEsGmx) {
    nextTotalGmx = nextTotalGmx + accumulatedEsGMX;
  }

  if (
    nextTotalGmx > 0 &&
    bigMath.mulDiv(nextTotalBnGMX, BASIS_POINTS_DIVISOR_BIGINT, nextTotalGmx) > maxBoostBasicPoints
  ) {
    return bigMath.mulDiv(nextTotalBnGMX, BASIS_POINTS_DIVISOR_BIGINT, maxBoostBasicPoints) - nextTotalGmx;
  }

  return BN_ZERO;
}
