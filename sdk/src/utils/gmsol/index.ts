import { bigMath } from "utils/bigmath";
import { expandDecimals, roundUpMagnitudeDivision } from "utils/numbers";
import type { TokenData } from "utils/tokens/types";

export * from "./units";

/** Data-only opt-in, also usable by gmx-api without a selected network. */
export type GmsolMarketConfig = {
  tradeMath?: "gmsol";
  minCollateralUsd?: bigint;
  minPositionSizeUsd?: bigint;
};

/** The impact is settled in the entry size; it never becomes pending collateral. 0 means the order fills no tokens. */
export function getGmsolIncreaseSizeDeltaInTokens(p: {
  baseSizeDeltaInTokens: bigint;
  priceImpactDeltaUsd: bigint;
  indexToken: TokenData;
  isLong: boolean;
}) {
  const { baseSizeDeltaInTokens, priceImpactDeltaUsd, indexToken, isLong } = p;
  const unit = expandDecimals(1, indexToken.decimals);
  const impactAmount =
    priceImpactDeltaUsd > 0n
      ? bigMath.mulDiv(priceImpactDeltaUsd, unit, indexToken.prices.maxPrice)
      : roundUpMagnitudeDivision(priceImpactDeltaUsd * unit, indexToken.prices.minPrice);
  return bigMath.max(baseSizeDeltaInTokens + (isLong ? impactAmount : -impactAmount), 0n);
}

/** Rent is a refundable deposit. The maximum keeper fee can be spent even on a cancelled execution. */
export function getGmsolExecutionFee(p: {
  maxExecutionLamports: bigint;
  orderRentLamports: bigint;
  escrowRentLamports: bigint;
  solPrice: bigint;
}) {
  const { maxExecutionLamports, orderRentLamports, escrowRentLamports, solPrice } = p;
  if ([maxExecutionLamports, orderRentLamports, escrowRentLamports, solPrice].some((value) => value < 0n)) {
    throw new Error("Execution fee inputs must be nonnegative");
  }
  const keeperFeeLamports = bigMath.max(300_000n, maxExecutionLamports);
  const refundableRentLamports = orderRentLamports + escrowRentLamports;
  return {
    keeperFeeLamports,
    keeperFeeUsd: bigMath.mulDiv(keeperFeeLamports, solPrice, 1_000_000_000n),
    refundableRentLamports,
    refundableRentUsd: bigMath.mulDiv(refundableRentLamports, solPrice, 1_000_000_000n),
    requiredLamports: keeperFeeLamports + refundableRentLamports,
  };
}

export function getGmsolExecutionFeeRefund(p: {
  keeperFeeLamports: bigint;
  refundableRentLamports: bigint;
  executionLamportsSpent: bigint;
  ownerCancelledBeforeExecution: boolean;
}) {
  const spent = p.ownerCancelledBeforeExecution
    ? 0n
    : bigMath.min(p.keeperFeeLamports, bigMath.max(0n, p.executionLamportsSpent));
  return { keeperCostLamports: spent, refundLamports: p.refundableRentLamports + p.keeperFeeLamports - spent };
}
