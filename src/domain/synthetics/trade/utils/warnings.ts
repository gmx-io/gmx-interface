import { HIGH_COLLATERAL_IMPACT_BPS, HIGH_SWAP_IMPACT_BPS, HIGH_POSITION_IMPACT_BPS } from "config/factors";
import { bigMath } from "sdk/utils/bigmath";
import type { FeeItem } from "../../fees";
import { HIGH_EXTERNAL_SWAP_FEES_BPS } from "config/externalSwaps";

export function getIsHighCollateralImpact(collateralImpact?: FeeItem) {
  return Boolean(
    collateralImpact && collateralImpact.deltaUsd < 0 && bigMath.abs(collateralImpact.bps) >= HIGH_COLLATERAL_IMPACT_BPS
  );
}

export function getIsHighSwapImpact(swapPriceImpact?: FeeItem) {
  return Boolean(
    swapPriceImpact && swapPriceImpact.deltaUsd < 0 && bigMath.abs(swapPriceImpact.bps) >= HIGH_SWAP_IMPACT_BPS
  );
}

export function getIsHighPositionImpact(positionImpact?: FeeItem) {
  return Boolean(
    positionImpact && positionImpact.deltaUsd < 0 && bigMath.abs(positionImpact.bps) >= HIGH_POSITION_IMPACT_BPS
  );
}

export function getIsHighExternalSwapFees(externalSwapFees?: FeeItem) {
  return Boolean(
    externalSwapFees &&
      externalSwapFees.deltaUsd < 0 &&
      bigMath.abs(externalSwapFees.bps) >= HIGH_EXTERNAL_SWAP_FEES_BPS
  );
}
