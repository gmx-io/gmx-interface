import { BigNumber } from "ethers";
import { hashString, hashData } from "lib/hash";

export const SWAP_IMPACT_FACTOR = hashString("SWAP_IMPACT_FACTOR");
export const SWAP_IMPACT_EXPONENT_FACTOR = hashString("SWAP_IMPACT_EXPONENT_FACTOR");
export const OPEN_INTEREST = hashString("OPEN_INTEREST");
export const POOL_AMOUNT = hashString("POOL_AMOUNT");
export const RESERVE_FACTOR = hashString("RESERVE_FACTOR");
export const NONCE = hashString("NONCE");

export function swapImpactFactorKey(marketAddress: string, isPositive: boolean) {
  return hashData(["bytes32", "address", "bool"], [SWAP_IMPACT_FACTOR, marketAddress, isPositive]);
}

export function swapImpactExponentFactorKey(marketAddress: string) {
  return hashData(["bytes32", "address"], [SWAP_IMPACT_EXPONENT_FACTOR, marketAddress]);
}

export function openInterestKey(market: string, collateralToken: string, isLong: boolean) {
  return hashData(["bytes32", "address", "address", "bool"], [OPEN_INTEREST, market, collateralToken, isLong]);
}

export function poolAmountKey(market: string, token: string) {
  return hashData(["bytes32", "address", "address"], [POOL_AMOUNT, market, token]);
}

export function reserveFactorKey(market: string, isLong: boolean) {
  return hashData(["bytes32", "address", "bool"], [RESERVE_FACTOR, market, isLong]);
}

export function orderKey(nonce: BigNumber) {
  return hashData(["uint256"], [nonce]);
}
