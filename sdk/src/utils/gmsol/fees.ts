import { GMSOL_PRECISION } from "./constants";
import { gmsolMath } from "./numbers";
import type { GmsolFeeDiscountConfig } from "./types";

export function getGmsolOrderFeeDiscountFactor({
  config,
  rank,
  isReferred,
}: {
  config: GmsolFeeDiscountConfig;
  rank: number;
  isReferred: boolean;
}): bigint {
  const byRank = config.byRank[rank];
  if (rank > config.maxRank || byRank === undefined) {
    throw new Error(`rank ${rank} exceeds the max rank ${config.maxRank}`);
  }
  if (!isReferred) {
    return byRank;
  }
  if (config.referredUser > GMSOL_PRECISION) {
    throw new Error("the referred user discount is above 1");
  }
  return gmsolMath.toUnsigned(
    config.referredUser + gmsolMath.applyFactor(byRank, GMSOL_PRECISION - config.referredUser, "fee discount"),
    "fee discount"
  );
}
