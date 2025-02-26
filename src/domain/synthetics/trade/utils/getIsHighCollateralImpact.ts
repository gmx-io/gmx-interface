import { HIGH_COLLATERAL_IMPACT_BPS } from "config/factors";
import { bigMath } from "sdk/utils/bigmath";
import type { FeeItem } from "../../fees";

export function getIsHighCollateralImpact(collateralImpact?: FeeItem) {
  return Boolean(
    collateralImpact &&
      collateralImpact.deltaUsd < 0n &&
      bigMath.abs(collateralImpact.bps) >= BigInt(HIGH_COLLATERAL_IMPACT_BPS)
  );
}
