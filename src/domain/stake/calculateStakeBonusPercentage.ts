import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { bigMath } from "sdk/utils/bigmath";

export function calculateStakeBonusPercentage({
  esGmxInStakedGmx,
  gmxInStakedGmx,
  stakeAmount,
}: {
  esGmxInStakedGmx: bigint | undefined;
  gmxInStakedGmx: bigint | undefined;
  stakeAmount: bigint | undefined;
}): bigint | undefined {
  if (stakeAmount !== undefined && stakeAmount > 0n && esGmxInStakedGmx !== undefined && gmxInStakedGmx !== undefined) {
    const divisor = esGmxInStakedGmx + gmxInStakedGmx;
    if (divisor !== 0n) {
      return bigMath.mulDiv(stakeAmount, BASIS_POINTS_DIVISOR_BIGINT, divisor);
    }
  }
  return undefined;
}
