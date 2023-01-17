import { BigNumber } from "ethers";
import { hashString, hashData } from "lib/hash";

export const SWAP_IMPACT_FACTOR_KEY = hashString("SWAP_IMPACT_FACTOR");
export const SWAP_IMPACT_EXPONENT_FACTOR_KEY = hashString("SWAP_IMPACT_EXPONENT_FACTOR");
export const OPEN_INTEREST_KEY = hashString("OPEN_INTEREST");
export const POOL_AMOUNT_KEY = hashString("POOL_AMOUNT");
export const RESERVE_FACTOR_KEY = hashString("RESERVE_FACTOR");
export const NONCE_KEY = hashString("NONCE");
export const MIN_COLLATERAL_USD_KEY = hashString("MIN_COLLATERAL_USD");
export const MAX_LEVERAGE_KEY = hashString("MAX_LEVERAGE");
export const DEPOSIT_GAS_LIMIT_KEY = hashString("NATIVE_TOKEN_TRANSFER_GAS_LIMIT");
export const WITHDRAWAL_GAS_LIMIT_KEY = hashString("TOKEN_TRANSFER_GAS_LIMIT");
export const SINGLE_SWAP_GAS_LIMIT_KEY = hashString("DECREASE_ORDER_GAS_LIMIT");
export const INCREASE_ORDER_GAS_LIMIT_KEY = hashString("SWAP_ORDER_GAS_LIMIT");
export const DECREASE_ORDER_GAS_LIMIT_KEY = hashString("INCREASE_ORDER_GAS_LIMIT");
export const SWAP_ORDER_GAS_LIMIT_KEY = hashString("SINGLE_SWAP_GAS_LIMIT");
export const TOKEN_TRANSFER_GAS_LIMIT_KEY = hashString("WITHDRAWAL_GAS_LIMIT");
export const NATIVE_TOKEN_TRANSFER_GAS_LIMIT_KEY = hashString("DEPOSIT_GAS_LIMIT");

export function getSwapImpactFactorKey(marketAddress: string, isPositive: boolean) {
  return hashData(["bytes32", "address", "bool"], [SWAP_IMPACT_FACTOR_KEY, marketAddress, isPositive]);
}

export function getSwapImpactExponentFactorKey(marketAddress: string) {
  return hashData(["bytes32", "address"], [SWAP_IMPACT_EXPONENT_FACTOR_KEY, marketAddress]);
}

export function getOpenInterestKey(market: string, collateralToken: string, isLong: boolean) {
  return hashData(["bytes32", "address", "address", "bool"], [OPEN_INTEREST_KEY, market, collateralToken, isLong]);
}

export function getPoolAmountKey(market: string, token: string) {
  return hashData(["bytes32", "address", "address"], [POOL_AMOUNT_KEY, market, token]);
}

export function getReserveFactorKey(market: string, isLong: boolean) {
  return hashData(["bytes32", "address", "bool"], [RESERVE_FACTOR_KEY, market, isLong]);
}

export function getOrderKey(nonce: BigNumber) {
  return hashData(["uint256"], [nonce]);
}

export function getDepositGasLimitKey(singleToken: boolean) {
  return hashData(["bytes32", "bool"], [DEPOSIT_GAS_LIMIT_KEY, singleToken]);
}

export function getWithdrawalGasLimitKey(singleToken: boolean) {
  return hashData(["bytes32", "bool"], [WITHDRAWAL_GAS_LIMIT_KEY, singleToken]);
}

export function getSingleSwapGasLimitKey() {
  return hashData(["bytes32"], [SINGLE_SWAP_GAS_LIMIT_KEY]);
}

export function getIncreaseOrderGasLimitKey() {
  return hashData(["bytes32"], [INCREASE_ORDER_GAS_LIMIT_KEY]);
}

export function getDecreaseOrderGasLimitKey() {
  return hashData(["bytes32"], [DECREASE_ORDER_GAS_LIMIT_KEY]);
}

export function getSwapOrderGasLimitKey() {
  return hashData(["bytes32"], [SWAP_ORDER_GAS_LIMIT_KEY]);
}
