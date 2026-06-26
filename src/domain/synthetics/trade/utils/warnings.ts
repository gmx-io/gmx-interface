import { HIGH_EXTERNAL_SWAP_FEES_BPS } from "config/externalSwaps";
import { HIGH_COLLATERAL_IMPACT_BPS, HIGH_SWAP_IMPACT_BPS } from "config/factors";
import { bigMath } from "sdk/utils/bigmath";
import { applyFactor } from "sdk/utils/numbers";

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

// 5% cushion on required maintenance collateral, to absorb execution fees/price impact.
const RESULTING_LIQUIDATION_FEE_BUFFER_BPS = 500n;

export function getIsResultingPositionLiquidatable(p: {
  nextCollateralUsd: bigint | undefined;
  nextPnl: bigint | undefined;
  nextSizeUsd: bigint | undefined;
  minCollateralFactorForLiquidation: bigint | undefined;
  minCollateralUsd: bigint | undefined;
}): boolean {
  const { nextCollateralUsd, nextPnl, nextSizeUsd, minCollateralFactorForLiquidation, minCollateralUsd } = p;
  if (
    nextCollateralUsd === undefined ||
    nextPnl === undefined ||
    nextSizeUsd === undefined ||
    minCollateralFactorForLiquidation === undefined ||
    minCollateralUsd === undefined
  ) {
    return false;
  }

  const maintenanceUsd = applyFactor(nextSizeUsd, minCollateralFactorForLiquidation);
  const requiredUsd = bigMath.max(maintenanceUsd, minCollateralUsd);
  const requiredWithBuffer = bigMath.mulDiv(requiredUsd, 10000n + RESULTING_LIQUIDATION_FEE_BUFFER_BPS, 10000n);

  return nextCollateralUsd + nextPnl < requiredWithBuffer;
}

export function getIsPositionLiquidatableAtPrice(p: {
  liqPrice: bigint | undefined;
  price: bigint | undefined;
  isLong: boolean;
}): boolean {
  const { liqPrice, price, isLong } = p;

  if (liqPrice === undefined || price === undefined) {
    return false;
  }

  return isLong ? liqPrice > price : liqPrice < price;
}
