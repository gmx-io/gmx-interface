import { BigNumber } from "ethers";
import { BN_ZERO } from "lib/numbers";
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

  const accumulatedGMX = p.accumulatedGMX ?? BN_ZERO;
  const accumulatedBnGMX = p.accumulatedBnGMX ?? BN_ZERO;
  const accumulatedEsGMX = p.accumulatedEsGMX ?? BN_ZERO;
  const stakedGMX = p.stakedGMX ?? BN_ZERO;
  const stakedBnGMX = p.stakedBnGMX ?? BN_ZERO;
  const stakedEsGMX = p.stakedEsGMX ?? BN_ZERO;

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

  return BN_ZERO;
}
