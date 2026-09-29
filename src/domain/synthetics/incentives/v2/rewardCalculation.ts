import { applyFactor } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import type { IncentivesConfig } from "./types";

export function getBaseRewardUsd(feeUsd: bigint, multiplier: bigint, config: IncentivesConfig) {
  if (feeUsd <= 0n || multiplier <= 0n || config.multiplierDecimals <= 0n) return 0n;

  return applyFactor(bigMath.mulDiv(feeUsd, multiplier, config.multiplierDecimals), config.feeShareFactor);
}
