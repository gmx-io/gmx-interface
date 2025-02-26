import { HIGH_POSITION_IMPACT_BPS } from "config/factors";
import { bigMath } from "sdk/utils/bigmath";
import type { FeeItem } from "../../fees";

export function getIsHighPositionImpact(positionImpact?: FeeItem) {
  return Boolean(
    positionImpact && positionImpact.deltaUsd < 0 && bigMath.abs(positionImpact.bps) >= HIGH_POSITION_IMPACT_BPS
  );
}
