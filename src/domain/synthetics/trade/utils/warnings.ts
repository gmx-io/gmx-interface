import { HIGH_EXTERNAL_SWAP_FEES_BPS } from "config/externalSwaps";
import { HIGH_COLLATERAL_IMPACT_BPS, HIGH_SWAP_IMPACT_BPS, HIGH_SWAP_PROFIT_FEE_BPS } from "config/factors";
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

export function getIsHighSwapProfitFee(swapProfitFee?: FeeItem) {
  return Boolean(
    swapProfitFee && swapProfitFee.deltaUsd < 0 && bigMath.abs(swapProfitFee.bps) >= HIGH_SWAP_PROFIT_FEE_BPS
  );
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

export function getIsPositionLiquidatedBeforeTrigger(p: {
  liqPrice: bigint | undefined;
  triggerPrice: bigint | undefined;
  isLong: boolean;
}): boolean {
  const { liqPrice, triggerPrice, isLong } = p;

  return getIsPositionLiquidatableAtPrice({ liqPrice, price: triggerPrice, isLong });
}

export function getIsIncreaseResultingPositionLiquidatable(p: {
  currentLiqPrice: bigint | undefined;
  nextLiqPrice: bigint | undefined;
  triggerPrice: bigint | undefined;
  isLong: boolean;
}): boolean {
  const { currentLiqPrice, nextLiqPrice, triggerPrice, isLong } = p;

  if (getIsPositionLiquidatableAtPrice({ liqPrice: currentLiqPrice, price: triggerPrice, isLong })) {
    return false;
  }

  return getIsPositionLiquidatableAtPrice({ liqPrice: nextLiqPrice, price: triggerPrice, isLong });
}
