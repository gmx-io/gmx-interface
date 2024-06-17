import { mustNeverExist } from "lib/types";

export type OraclePriceCountKind = "depositGM" | "withdrawalGM" | "order";

// export function getEstimateOraclePriceCount(oraclePriceCountKind: OraclePriceCountKind, swapCount: number): number {
//   if (oraclePriceCountKind === "depositGM") {
//     return getEstimateDepositOraclePriceCount(swapCount);
//   }

//   if (oraclePriceCountKind === "withdrawalGM") {
//     return getEstimateWithdrawalOraclePriceCount(swapCount);
//   }

//   if (oraclePriceCountKind === "order") {
//     return getEstimateOrderOraclePriceCount(swapCount);
//   }

//   return mustNeverExist(oraclePriceCountKind);
// }

// @see https://github.com/gmx-io/gmx-synthetics/blob/6ed9be061d8fcc0dc7bc5d34dee3bf091408a1bf/contracts/gas/GasUtils.sol#L218-L234
export function estimateDepositOraclePriceCount(swapsCount: number): bigint {
  return 3n + BigInt(swapsCount);
}

export function estimateWithdrawalOraclePriceCount(swapsCount: number): bigint {
  return 3n + BigInt(swapsCount);
}

export function estimateOrderOraclePriceCount(swapsCount: number): bigint {
  return 3n + BigInt(swapsCount);
}
