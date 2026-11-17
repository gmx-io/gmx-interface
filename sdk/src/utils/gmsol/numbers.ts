import { GMSOL_MAX_SIGNED, GMSOL_MAX_UNSIGNED, GMSOL_PRECISION } from "./constants";
import type { Decimal } from "./types";

const MAX_COEFFICIENT = (1n << 96n) - 1n;
const MAX_U64 = (1n << 64n) - 1n;
const MAX_I64 = (1n << 63n) - 1n;
const UNIT = 1_000_000_000n;
const INPUT_SCALE = GMSOL_PRECISION / UNIT;
const ONE: Decimal = { coefficient: 1n, scale: 0 };
const E: Decimal = { coefficient: 27182818284590452353602874714n, scale: 28 };
const INVERSE_E: Decimal = { coefficient: 3678794411714423215955237702n, scale: 28 };

function roundEven(numerator: bigint, denominator: bigint) {
  const quotient = numerator / denominator;
  const twiceRemainder = (numerator % denominator) * 2n;
  return (
    quotient + (twiceRemainder > denominator || (twiceRemainder === denominator && quotient % 2n !== 0n) ? 1n : 0n)
  );
}

function fit(coefficient: bigint, scale: number): Decimal {
  const sign = coefficient < 0n ? -1n : 1n;
  let magnitude = coefficient * sign;
  let removed = Math.max(0, scale - 28);
  while (magnitude / 10n ** BigInt(removed) > MAX_COEFFICIENT) {
    removed++;
  }
  if (removed > scale) {
    throw new Error("Solana decimal overflow");
  }
  magnitude = roundEven(magnitude, 10n ** BigInt(removed));
  scale -= removed;
  if (magnitude > MAX_COEFFICIENT) {
    if (scale === 0) throw new Error("Solana decimal overflow");
    magnitude = roundEven(magnitude, 10n);
    scale--;
  }
  return { coefficient: magnitude * sign, scale };
}

function add(left: Decimal, right: Decimal): Decimal {
  if (left.coefficient === 0n) return right;
  if (right.coefficient === 0n) return left;
  const scale = Math.max(left.scale, right.scale);
  return fit(
    left.coefficient * 10n ** BigInt(scale - left.scale) + right.coefficient * 10n ** BigInt(scale - right.scale),
    scale
  );
}

function subtract(left: Decimal, right: Decimal): Decimal {
  return add(left, { coefficient: -right.coefficient, scale: right.scale });
}

function multiply(left: Decimal, right: Decimal): Decimal {
  return fit(left.coefficient * right.coefficient, left.scale + right.scale);
}

function compare(left: Decimal, right: Decimal) {
  const scale = Math.max(left.scale, right.scale);
  const difference =
    left.coefficient * 10n ** BigInt(scale - left.scale) - right.coefficient * 10n ** BigInt(scale - right.scale);
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

function divideByInteger(value: Decimal, divisor: bigint): Decimal {
  let scale = value.scale;
  let coefficient = value.coefficient / divisor;
  let remainder = value.coefficient % divisor;
  const fractional = remainder !== 0n;
  while (remainder !== 0n && scale < 28 && coefficient * 10n <= MAX_COEFFICIENT) {
    let digits = Math.min(9, 28 - scale);
    while (coefficient * 10n ** BigInt(digits) > MAX_COEFFICIENT) digits--;
    const multiplier = 10n ** BigInt(digits);
    coefficient = coefficient * multiplier + (remainder * multiplier) / divisor;
    remainder = (remainder * multiplier) % divisor;
    scale += digits;
    if (coefficient > MAX_COEFFICIENT) {
      const lastDigit = coefficient % 10n;
      coefficient /= 10n;
      if (lastDigit > 5n || (lastDigit === 5n && (remainder !== 0n || coefficient % 2n !== 0n))) coefficient++;
      scale--;
      remainder = 0n;
    }
  }
  if (remainder !== 0n) {
    coefficient = roundEven(coefficient * divisor + remainder, divisor);
  }
  const result = fit(coefficient, scale);
  if (fractional) {
    while (result.scale >= 8 && (result.coefficient & 0xffffffffn) === 0n && result.coefficient % 100_000_000n === 0n) {
      result.coefficient /= 100_000_000n;
      result.scale -= 8;
    }
    for (const digits of [4, 2, 1]) {
      const divisor = 10n ** BigInt(digits);
      if (result.scale >= digits && result.coefficient % divisor === 0n) {
        result.coefficient /= divisor;
        result.scale -= digits;
      }
    }
  }
  return result;
}

function logarithm(value: Decimal): Decimal {
  let x = value;
  let count = 0n;
  while (compare(x, ONE) >= 0) {
    x = multiply(x, INVERSE_E);
    count++;
  }
  while (compare(x, INVERSE_E) <= 0) {
    x = multiply(x, E);
    count--;
  }
  x = subtract(ONE, x);
  let result: Decimal = { coefficient: 0n, scale: 0 };
  let term = ONE;
  for (let iteration = 1n; iteration <= 100n; iteration++) {
    term = multiply(term, x);
    const next = add(result, divideByInteger(term, iteration));
    if (compare(next, result) === 0) break;
    result = next;
  }
  return subtract({ coefficient: count, scale: 0 }, result);
}

function exponential(value: Decimal): Decimal {
  let term = value;
  let result = add(value, ONE);
  let factorial = 1n;
  for (let iteration = 2n; iteration <= 27n; iteration++) {
    factorial *= iteration;
    term = multiply(value, term);
    const next = add(result, divideByInteger(term, factorial));
    const difference = subtract(next, result);
    result = next;
    if (compare(difference, { coefficient: 2n, scale: 7 }) <= 0) break;
  }
  return result;
}

export function getGmsolFractionalPower(base20: bigint, exponent20: bigint): bigint {
  const base = base20 / INPUT_SCALE;
  const exponent = exponent20 / INPUT_SCALE;
  if (base < UNIT || base > MAX_U64 || exponent < 0n || exponent > MAX_U64) {
    throw new Error("Solana fractional power input exceeds native range");
  }
  let result: bigint;
  if (exponent % UNIT === 0n) {
    result = UNIT;
    if (base !== UNIT) {
      if (exponent > 128n * UNIT) throw new Error("Solana impact exponent exceeds calculation limit");
      for (let remaining = exponent; remaining > 0n; remaining -= UNIT) {
        result = (result * base) / UNIT;
        if (result > MAX_U64) throw new Error("Solana fractional power exceeds native range");
      }
    }
  } else {
    if (base > MAX_I64 || exponent > MAX_I64) {
      throw new Error("Solana decimal input exceeds native range");
    }
    const power =
      base === UNIT
        ? ONE
        : exponential(multiply(logarithm({ coefficient: base, scale: 9 }), { coefficient: exponent, scale: 9 }));
    if (power.scale > 9) {
      const divisor = 10n ** BigInt(power.scale - 9);
      result = power.coefficient / divisor + ((power.coefficient % divisor) * 2n >= divisor ? 1n : 0n);
    } else {
      result = power.coefficient;
      for (let scale = power.scale; scale < 9 && result * 10n <= MAX_COEFFICIENT; scale++) result *= 10n;
    }
    if (result < 0n || result > MAX_U64) throw new Error("Solana fractional power exceeds native range");
  }
  return result * INPUT_SCALE;
}

// gmsol's checked u128 and i128 arithmetic on 20-decimal fixed point: a result outside the type is an error, never a wrapped value
export const gmsolMath = {
  toUnsigned(value: bigint, what: string): bigint {
    if (value < 0n || value > GMSOL_MAX_UNSIGNED) {
      throw new Error(`u128 overflow in ${what}`);
    }
    return value;
  },
  toSigned(value: bigint, what: string): bigint {
    if (value < -GMSOL_MAX_SIGNED - 1n || value > GMSOL_MAX_SIGNED) {
      throw new Error(`i128 overflow in ${what}`);
    }
    return value;
  },
  mulDiv(a: bigint, b: bigint, divisor: bigint, what: string): bigint {
    if (divisor === 0n) {
      throw new Error(`division by zero in ${what}`);
    }
    return gmsolMath.toUnsigned((a * b) / divisor, what);
  },
  mulDivCeil(a: bigint, b: bigint, divisor: bigint, what: string): bigint {
    if (divisor === 0n) {
      throw new Error(`division by zero in ${what}`);
    }
    return gmsolMath.toUnsigned((a * b + divisor - 1n) / divisor, what);
  },
  // gmsol's checked_round_up_div, whose intermediate sum must fit in u128
  roundUpDiv(value: bigint, divisor: bigint, what: string): bigint {
    return (gmsolMath.toUnsigned(value + divisor, what) - 1n) / divisor;
  },
  applyFactor(value: bigint, factor: bigint, what: string): bigint {
    return gmsolMath.mulDiv(value, factor, GMSOL_PRECISION, what);
  },
  divToFactor(value: bigint, divisor: bigint, what: string): bigint {
    return divisor === 0n ? 0n : gmsolMath.mulDiv(value, GMSOL_PRECISION, divisor, what);
  },
  // a value below one unit counts as none, as in GMX's applyExponentFactor
  applyExponentFactor(value: bigint, exponent: bigint, what: string): bigint {
    if (value < GMSOL_PRECISION) {
      return 0n;
    }
    if (value === GMSOL_PRECISION || exponent === 0n) {
      return GMSOL_PRECISION;
    }
    if (exponent % GMSOL_PRECISION !== 0n) {
      return gmsolMath.toUnsigned(getGmsolFractionalPower(value, exponent), what);
    }
    let result = GMSOL_PRECISION;
    for (let i = 0n; i < exponent / GMSOL_PRECISION; i++) {
      result = gmsolMath.mulDiv(result, value, GMSOL_PRECISION, what);
    }
    return result;
  },
};
