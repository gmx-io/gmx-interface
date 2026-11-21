import { CROSS_CHAIN_SLIPPAGE_AMOUNT, DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { bigMath } from "sdk/utils/bigmath";
import { BASIS_POINTS_DIVISOR_BIGINT } from "sdk/utils/numbers";

import type { GmPaySource, RawCreateDepositParams, RawCreateGlvDepositParams } from "./types";

export function getLpDepositSlippageAmount(paySource: GmPaySource | undefined): number {
  return paySource === "sourceChain" ? CROSS_CHAIN_SLIPPAGE_AMOUNT : DEFAULT_SLIPPAGE_AMOUNT;
}

export function getPoolTokenMinOutput(slippage: number, quote: bigint): bigint {
  const retainedBps = BASIS_POINTS_DIVISOR_BIGINT - BigInt(slippage);
  if (quote * retainedBps < BASIS_POINTS_DIVISOR_BIGINT) return 0n;
  return bigMath.mulDiv(quote, retainedBps, BASIS_POINTS_DIVISOR_BIGINT, true);
}

export type DepositMinOutputParams =
  | Pick<RawCreateDepositParams, "minMarketTokens">
  | Pick<RawCreateGlvDepositParams, "minGlvTokens" | "isMarketTokenDeposit">;

export function getIsLpDepositMinOutputPositive({
  params,
  gmLegAmount,
  slippage,
}: {
  params: DepositMinOutputParams;
  gmLegAmount: bigint | undefined;
  slippage: number;
}): boolean {
  if (!("minGlvTokens" in params)) {
    return params.minMarketTokens > 0n;
  }

  if (params.minGlvTokens <= 0n) {
    return false;
  }

  if (params.isMarketTokenDeposit) {
    return true;
  }

  return gmLegAmount !== undefined && getPoolTokenMinOutput(slippage, gmLegAmount) > 0n;
}

export function assertPositiveMinOutputAmount(minOutputAmount: bigint) {
  if (minOutputAmount <= 0n) {
    throw new Error("Minimum output amount after slippage must be positive");
  }
}
