import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";

export const PRECISION = expandDecimals(1, 30);

const MAX_EXCEEDING_THRESHOLD = "1000000000";
const MIN_EXCEEDING_THRESHOLD = "0.01";

export const BN_ZERO = 0n;
export const BN_ONE = 1n;
export const BN_NEGATIVE_ONE = -1n;

export function expandDecimals(n: bigint | number, decimals: number): bigint {
  return BigInt(n) * 10n ** BigInt(decimals);
}

export function basisPointsToFloat(basisPoints: bigint) {
  return (basisPoints * PRECISION) / BASIS_POINTS_DIVISOR_BIGINT;
}

export function getBasisPoints(numerator: bigint, denominator: bigint, shouldRoundUp = false) {
  const result = (numerator * BASIS_POINTS_DIVISOR_BIGINT) / denominator;

  if (shouldRoundUp) {
    const remainder = (numerator * BASIS_POINTS_DIVISOR_BIGINT) % denominator;
    if (remainder !== 0n) {
      return result < 0n ? result - 1n : result + 1n;
    }
  }

  return result;
}

export function roundUpMagnitudeDivision(a: bigint, b: bigint) {
  if (a < 0n) {
    return (a - b + 1n) / b;
  }

  return (a + b - 1n) / b;
}

export function applyFactor(value: bigint, factor: bigint) {
  return (value * factor) / PRECISION;
}
