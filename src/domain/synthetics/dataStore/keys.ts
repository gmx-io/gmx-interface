import { hashString, hashData } from "lib/hash";

export const SWAP_IMPACT_FACTOR = hashString("SWAP_IMPACT_FACTOR");
export const SWAP_IMPACT_EXPONENT_FACTOR = hashString("SWAP_IMPACT_EXPONENT_FACTOR");

const OPEN_INTEREST = hashString("OPEN_INTEREST");

export function swapImpactFactorKey(marketAddress: string, isPositive: boolean) {
  return hashData(["bytes32", "address", "bool"], [SWAP_IMPACT_FACTOR, marketAddress, isPositive]);
}

export function swapImpactExponentFactorKey(marketAddress: string) {
  return hashData(["bytes32", "address"], [SWAP_IMPACT_EXPONENT_FACTOR, marketAddress]);
}

export function openInterestKey(market: string, collateralToken: string, isLong: boolean) {
  return hashData(["bytes32", "address", "address", "bool"], [OPEN_INTEREST, market, collateralToken, isLong]);
}
