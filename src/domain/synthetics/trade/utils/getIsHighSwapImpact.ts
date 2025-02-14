import { HIGH_SWAP_IMPACT_BPS } from "config/factors";
import { bigMath } from "sdk/utils/bigmath";
import type { FeeItem } from "domain/synthetics/fees";

export function getIsHighSwapImpact(swapPriceImpact?: FeeItem) {
  return Boolean(
    swapPriceImpact && swapPriceImpact.deltaUsd < 0 && bigMath.abs(swapPriceImpact.bps) >= HIGH_SWAP_IMPACT_BPS
  );
}
