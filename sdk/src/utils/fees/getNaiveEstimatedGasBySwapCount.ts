import type { GasLimitsConfig } from "utils/fees/types";

export function getNaiveEstimatedGasBySwapCount(singleSwap: GasLimitsConfig["singleSwap"], swapsCount: number): bigint {
  const swapsCountBigint = BigInt(swapsCount);

  return singleSwap * swapsCountBigint;
}
