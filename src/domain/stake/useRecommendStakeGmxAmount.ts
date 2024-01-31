import { BigNumber } from "ethers";
import { BIG_ZERO } from "lib/numbers";
import { BASIS_POINTS_DIVISOR } from "config/factors";

import { useMaxBoostBasicPoints } from "domain/rewards/useMaxBoostBasisPoints";

export function useRecommendStakeGmxAmount(
  p: {
    accumulatedGMX?: BigNumber;
    accumulatedBnGMX?: BigNumber;
    accumulatedEsGMX?: BigNumber;
    stakedGMX?: BigNumber;
    stakedBnGMX?: BigNumber;
    stakedEsGMX?: BigNumber;
  },
  conditions: {
    shouldStakeGmx?: boolean;
    shouldStakeEsGmx?: boolean;
  }
) {
  const maxBoostBasicPoints = useMaxBoostBasicPoints();

  const accumulatedGMX = p.accumulatedGMX ?? BIG_ZERO;
  const accumulatedBnGMX = p.accumulatedBnGMX ?? BIG_ZERO;
  const accumulatedEsGMX = p.accumulatedEsGMX ?? BIG_ZERO;
  const stakedGMX = p.stakedGMX ?? BIG_ZERO;
  const stakedBnGMX = p.stakedBnGMX ?? BIG_ZERO;
  const stakedEsGMX = p.stakedEsGMX ?? BIG_ZERO;

  const nextTotalBnGMX = stakedBnGMX.add(accumulatedBnGMX);
  let nextTotalGmx = stakedGMX.add(stakedEsGMX);

  if (conditions.shouldStakeGmx) {
    nextTotalGmx = nextTotalGmx.add(accumulatedGMX);
  }

  if (conditions.shouldStakeEsGmx) {
    nextTotalGmx = nextTotalGmx.add(accumulatedEsGMX);
  }

  if (nextTotalGmx.gt(0) && nextTotalBnGMX.mul(BASIS_POINTS_DIVISOR).div(nextTotalGmx).gt(maxBoostBasicPoints)) {
    return nextTotalBnGMX.mul(BASIS_POINTS_DIVISOR).div(maxBoostBasicPoints).sub(nextTotalGmx);
  }

  return BIG_ZERO;
}
