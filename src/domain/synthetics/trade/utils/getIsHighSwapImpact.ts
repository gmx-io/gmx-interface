import { HIGH_SWAP_IMPACT_BPS } from "config/factors";
import { bigMath } from "sdk/utils/bigmath";
import type { FeeItem } from "domain/synthetics/fees";

export function getIsHighSwapImpact(swapPriceImpact?: FeeItem) {
  return Boolean(
    swapPriceImpact && swapPriceImpact.deltaUsd < 0n && bigMath.abs(swapPriceImpact.bps) >= BigInt(HIGH_SWAP_IMPACT_BPS)
  );
}
