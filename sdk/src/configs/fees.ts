import { ContractsChainId, getResidualGasUsdConfig } from "configs/chains";
import { expandDecimals, USD_DECIMALS } from "utils/numbers";

export const DEFAULT_MIN_RESIDUAL_GAS_USD_NUMBER = 20;
export const DEFAULT_MIN_RESIDUAL_GAS_USD = expandDecimals(DEFAULT_MIN_RESIDUAL_GAS_USD_NUMBER, USD_DECIMALS);
const DEFAULT_MAX_RESIDUAL_GAS_USD_NUMBER = 40;
export const DEFAULT_MAX_RESIDUAL_GAS_USD = expandDecimals(DEFAULT_MAX_RESIDUAL_GAS_USD_NUMBER, USD_DECIMALS);
export const RESIDUAL_GAS_AMOUNT_MULTIPLIER = 20n;

export function getResidualGasUsd(chainId: ContractsChainId): { min: bigint; max: bigint } {
  const config = getResidualGasUsdConfig(chainId);
  if (config) {
    return {
      min: expandDecimals(config.min, USD_DECIMALS),
      max: expandDecimals(config.max, USD_DECIMALS),
    };
  }
  return { min: DEFAULT_MIN_RESIDUAL_GAS_USD, max: DEFAULT_MAX_RESIDUAL_GAS_USD };
}
