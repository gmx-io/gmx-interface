import type { GasLimitsConfig } from "types/fees";

export function getNaiveEstimatedGasBySwapCount(singleSwap: GasLimitsConfig["singleSwap"], swapsCount: number): bigint {
  const swapsCountBigint = BigInt(swapsCount);

  return singleSwap * swapsCountBigint;
}
