import { HIGH_POSITION_IMPACT_BPS } from "config/factors";
import { bigMath } from "sdk/utils/bigmath";
import type { FeeItem } from "../../fees";

export function getIsHighPositionImpact(positionImpact?: FeeItem) {
  return Boolean(
    positionImpact &&
      positionImpact.deltaUsd < 0n &&
      bigMath.abs(positionImpact.bps) >= BigInt(HIGH_POSITION_IMPACT_BPS)
  );
}
