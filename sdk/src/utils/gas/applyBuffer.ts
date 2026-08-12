import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";

const MIN_GAS_LIMIT = 22_000n;
const GAS_LIMIT_BUFFER_BPS = 1_000n;

export function applyGasLimitBuffer(gasLimit: bigint): bigint {
  const value = gasLimit < MIN_GAS_LIMIT ? MIN_GAS_LIMIT : gasLimit;
  return (value * (BASIS_POINTS_DIVISOR_BIGINT + GAS_LIMIT_BUFFER_BPS)) / BASIS_POINTS_DIVISOR_BIGINT;
}
