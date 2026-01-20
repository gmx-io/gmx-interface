import type { GasLimitsConfig } from "../fees/types";

export function getNaiveEstimatedGasBySwapCount(singleSwap: GasLimitsConfig["singleSwap"], swapsCount: number): bigint {
  const swapsCountBigint = BigInt(swapsCount);

  return singleSwap * swapsCountBigint;
}
