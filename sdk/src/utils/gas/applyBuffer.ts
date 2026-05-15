const MIN_GAS_LIMIT = 22_000n;
const GAS_LIMIT_BUFFER_BPS = 1_000n; // +10%
const BPS = 10_000n;

export function applyGasLimitBuffer(gasLimit: bigint): bigint {
  const value = gasLimit < MIN_GAS_LIMIT ? MIN_GAS_LIMIT : gasLimit;
  return (value * (BPS + GAS_LIMIT_BUFFER_BPS)) / BPS;
}
