import { USD_DECIMALS } from "config/factors";
import { bigMath } from "lib/bigmath";
import { USDG_DECIMALS } from "lib/legacy";
import { bigintToNumber, numberToBigint } from "lib/numbers";

const abs = bigMath.abs;

function isOiFlip(longOpenInterest: bigint, shortOpenInterest: bigint, size: bigint): boolean {
  return (
    // prettier-ignore
    (longOpenInterest - shortOpenInterest > 0n) !== (longOpenInterest + size - shortOpenInterest > 0n)
  );
}

// export const FACTOR_MULTIPLIER = 10n ** 15n;

function isOiImprovement(longOpenInterest: bigint, shortOpenInterest: bigint, size: bigint): boolean {
  return abs(longOpenInterest - shortOpenInterest) > abs(longOpenInterest + size - shortOpenInterest);
}

function factor1(
  longOpenInterest: bigint,
  shortOpenInterest: bigint,
  size: bigint,
  positiveImpactFactor: bigint,
  negativeImpactFactor: bigint
): bigint {
  return isOiFlip(longOpenInterest, shortOpenInterest, size) ||
    isOiImprovement(longOpenInterest, shortOpenInterest, size)
    ? positiveImpactFactor
    : negativeImpactFactor;
}

function factor2(
  longOpenInterest: bigint,
  shortOpenInterest: bigint,
  size: bigint,
  positiveImpactFactor: bigint,
  negativeImpactFactor: bigint
): bigint {
  return isOiFlip(longOpenInterest, shortOpenInterest, size)
    ? negativeImpactFactor
    : isOiImprovement(longOpenInterest, shortOpenInterest, size)
      ? positiveImpactFactor
      : negativeImpactFactor;
}

export function priceImpact(
  longOpenInterest: bigint,
  shortOpenInterest: bigint,
  size: bigint,
  impactExponent: bigint,
  positiveImpactFactor: bigint,
  negativeImpactFactor: bigint,
  precision: bigint
): bigint {
  const d1 = Math.abs(Number((longOpenInterest - shortOpenInterest) / precision));
  const d2 = Math.abs(Number((longOpenInterest + size - shortOpenInterest) / precision));
  const e = bigintToNumber(impactExponent, USD_DECIMALS);

  console.log(
    "factor",
    bigintToNumber(
      factor1(longOpenInterest, shortOpenInterest, size, positiveImpactFactor, negativeImpactFactor) / precision,
      0
    )
  );

  return (
    (BigInt(Math.round(d1 ** e)) *
      10n ** BigInt(Math.round(USD_DECIMALS * e)) *
      factor1(longOpenInterest, shortOpenInterest, size, positiveImpactFactor, negativeImpactFactor) -
      BigInt(Math.round(d2 ** e)) *
        10n ** BigInt(Math.round(USD_DECIMALS * e)) *
        factor2(longOpenInterest, shortOpenInterest, size, positiveImpactFactor, negativeImpactFactor)) /
    precision
  );
}

export function executionPrice(
  longOpenInterest: bigint,
  shortOpenInterest: bigint,
  size: bigint,
  impactExponent: bigint,
  positiveImpactFactor: bigint,
  negativeImpactFactor: bigint,
  minPrice: bigint,
  maxPrice: bigint,
  precision: bigint
): bigint {
  return (
    (size > 0n ? maxPrice : minPrice) -
    ((size > 0n ? maxPrice : minPrice) *
      priceImpact(
        longOpenInterest,
        shortOpenInterest,
        size,
        impactExponent,
        positiveImpactFactor,
        negativeImpactFactor,
        precision
      )) /
      size
  );
}
