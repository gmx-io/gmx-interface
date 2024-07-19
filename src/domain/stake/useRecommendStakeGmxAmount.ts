/* eslint-disable @typescript-eslint/no-unused-vars */
import { BN_ZERO } from "lib/numbers";

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
  return BN_ZERO;
}
