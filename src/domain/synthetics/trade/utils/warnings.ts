import { HIGH_EXTERNAL_SWAP_FEES_BPS } from "config/externalSwaps";
import { HIGH_COLLATERAL_IMPACT_BPS, HIGH_SWAP_IMPACT_BPS } from "config/factors";
import { bigMath } from "sdk/utils/bigmath";

import type { FeeItem } from "../../fees";

export function getIsHighCollateralImpact(collateralNetPriceImpact?: FeeItem) {
  return Boolean(
    collateralNetPriceImpact &&
      collateralNetPriceImpact.deltaUsd < 0 &&
      bigMath.abs(collateralNetPriceImpact.bps) > HIGH_COLLATERAL_IMPACT_BPS
  );
}

export function getIsHighSwapImpact(swapPriceImpact?: FeeItem) {
  return Boolean(
    swapPriceImpact && swapPriceImpact.deltaUsd < 0 && bigMath.abs(swapPriceImpact.bps) > HIGH_SWAP_IMPACT_BPS
  );
}

export function getIsHighExternalSwapFees(externalSwapFees?: FeeItem) {
  return Boolean(
    externalSwapFees &&
      externalSwapFees.deltaUsd < 0 &&
      bigMath.abs(externalSwapFees.bps) >= HIGH_EXTERNAL_SWAP_FEES_BPS
  );
}
