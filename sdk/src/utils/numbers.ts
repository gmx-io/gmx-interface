import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";

export const PRECISION = expandDecimals(1, 30);

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

export function numberToBigint(value: number, decimals: number) {
  const negative = value < 0;
  if (negative) value *= -1;

  const int = Math.trunc(value);
  let frac = value - int;

  let res = BigInt(int);

  for (let i = 0; i < decimals; i++) {
    res *= 10n;
    if (frac !== 0) {
      frac *= 10;
      const fracInt = Math.trunc(frac);
      res += BigInt(fracInt);
      frac -= fracInt;
    }
  }

  return negative ? -res : res;
}

export function bigintToNumber(value: bigint, decimals: number) {
  const negative = value < 0;
  if (negative) value *= -1n;
  const precision = 10n ** BigInt(decimals);
  const int = value / precision;
  const frac = value % precision;

  const num = parseFloat(`${int}.${frac.toString().padStart(decimals, "0")}`);
  return negative ? -num : num;
}
