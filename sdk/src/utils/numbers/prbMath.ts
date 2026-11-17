/**
 * Exact bigint port of the fixed-point math the GMX contracts use for exponentiation:
 * `prb-math@2.4.3` (`PRBMathUD60x18.pow` = `exp2(mulDivFixedPoint(log2(x), y))`) plus the
 * `Precision.applyExponentFactor` wrapper from gmx-synthetics (release-v2.2c).
 */

const SCALE = 10n ** 18n;
const HALF_SCALE = 5n * 10n ** 17n;
const FLOAT_PRECISION = 10n ** 30n;
const FLOAT_TO_WEI_DIVISOR = 10n ** 12n;

const EXP2_MAX_INPUT = 192n * SCALE;

const EXP2_MAGIC: readonly (readonly [bigint, bigint])[] = [
  [0x8000000000000000n, 0x16a09e667f3bcc909n],
  [0x4000000000000000n, 0x1306fe0a31b7152dfn],
  [0x2000000000000000n, 0x1172b83c7d517adcen],
  [0x1000000000000000n, 0x10b5586cf9890f62an],
  [0x800000000000000n, 0x1059b0d31585743aen],
  [0x400000000000000n, 0x102c9a3e778060ee7n],
  [0x200000000000000n, 0x10163da9fb33356d8n],
  [0x100000000000000n, 0x100b1afa5abcbed61n],
  [0x80000000000000n, 0x10058c86da1c09ea2n],
  [0x40000000000000n, 0x1002c605e2e8cec50n],
  [0x20000000000000n, 0x100162f3904051fa1n],
  [0x10000000000000n, 0x1000b175effdc76ban],
  [0x8000000000000n, 0x100058ba01fb9f96dn],
  [0x4000000000000n, 0x10002c5cc37da9492n],
  [0x2000000000000n, 0x1000162e525ee0547n],
  [0x1000000000000n, 0x10000b17255775c04n],
  [0x800000000000n, 0x1000058b91b5bc9aen],
  [0x400000000000n, 0x100002c5c89d5ec6dn],
  [0x200000000000n, 0x10000162e43f4f831n],
  [0x100000000000n, 0x100000b1721bcfc9an],
  [0x80000000000n, 0x10000058b90cf1e6en],
  [0x40000000000n, 0x1000002c5c863b73fn],
  [0x20000000000n, 0x100000162e430e5a2n],
  [0x10000000000n, 0x1000000b172183551n],
  [0x8000000000n, 0x100000058b90c0b49n],
  [0x4000000000n, 0x10000002c5c8601ccn],
  [0x2000000000n, 0x1000000162e42fff0n],
  [0x1000000000n, 0x10000000b17217fbbn],
  [0x800000000n, 0x1000000058b90bfcen],
  [0x400000000n, 0x100000002c5c85fe3n],
  [0x200000000n, 0x10000000162e42ff1n],
  [0x100000000n, 0x100000000b17217f8n],
  [0x80000000n, 0x10000000058b90bfcn],
  [0x40000000n, 0x1000000002c5c85fen],
  [0x20000000n, 0x100000000162e42ffn],
  [0x10000000n, 0x1000000000b17217fn],
  [0x8000000n, 0x100000000058b90c0n],
  [0x4000000n, 0x10000000002c5c860n],
  [0x2000000n, 0x1000000000162e430n],
  [0x1000000n, 0x10000000000b17218n],
  [0x800000n, 0x1000000000058b90cn],
  [0x400000n, 0x100000000002c5c86n],
  [0x200000n, 0x10000000000162e43n],
  [0x100000n, 0x100000000000b1721n],
  [0x80000n, 0x10000000000058b91n],
  [0x40000n, 0x1000000000002c5c8n],
  [0x20000n, 0x100000000000162e4n],
  [0x10000n, 0x1000000000000b172n],
  [0x8000n, 0x100000000000058b9n],
  [0x4000n, 0x10000000000002c5dn],
  [0x2000n, 0x1000000000000162en],
  [0x1000n, 0x10000000000000b17n],
  [0x800n, 0x1000000000000058cn],
  [0x400n, 0x100000000000002c6n],
  [0x200n, 0x10000000000000163n],
  [0x100n, 0x100000000000000b1n],
  [0x80n, 0x10000000000000059n],
  [0x40n, 0x1000000000000002cn],
  [0x20n, 0x10000000000000016n],
  [0x10n, 0x1000000000000000bn],
  [0x8n, 0x10000000000000006n],
  [0x4n, 0x10000000000000003n],
  [0x2n, 0x10000000000000001n],
  [0x1n, 0x10000000000000001n],
];

function mulDivFixedPoint(x: bigint, y: bigint): bigint {
  const prod = x * y;
  return prod / SCALE + (prod % SCALE > 499999999999999999n ? 1n : 0n);
}

function mostSignificantBit(x: bigint): bigint {
  let n = 0n;
  while (x > 1n) {
    x >>= 1n;
    n += 1n;
  }
  return n;
}

function log2(x: bigint): bigint {
  if (x < SCALE) {
    throw new Error("prbMath log2: input too small");
  }

  const n = mostSignificantBit(x / SCALE);
  let result = n * SCALE;
  let y = x >> n;

  if (y === SCALE) {
    return result;
  }

  for (let delta = HALF_SCALE; delta > 0n; delta >>= 1n) {
    y = (y * y) / SCALE;
    if (y >= 2n * SCALE) {
      result += delta;
      y >>= 1n;
    }
  }

  return result;
}

function exp2(x: bigint): bigint {
  if (x >= EXP2_MAX_INPUT) {
    throw new Error("prbMath exp2: input too big");
  }

  const x192x64 = (x << 64n) / SCALE;

  let result = 0x800000000000000000000000000000000000000000000000n;

  for (const [mask, factor] of EXP2_MAGIC) {
    if (x192x64 & mask) {
      result = (result * factor) >> 64n;
    }
  }

  result *= SCALE;
  result >>= 191n - (x192x64 >> 64n);

  return result;
}

export function prbPow(x: bigint, y: bigint): bigint {
  if (x === 0n) {
    return y === 0n ? SCALE : 0n;
  }

  return exp2(mulDivFixedPoint(log2(x), y));
}

const APPLY_EXPONENT_CACHE_LIMIT = 1024;
const applyExponentCache = new Map<string, bigint>();

export function applyExponentFactor(floatValue: bigint, exponentFactor: bigint): bigint {
  if (floatValue < FLOAT_PRECISION) {
    return 0n;
  }

  if (exponentFactor === FLOAT_PRECISION) {
    return floatValue;
  }

  const cacheKey = `${floatValue}:${exponentFactor}`;
  const cached = applyExponentCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const result = prbPow(floatValue / FLOAT_TO_WEI_DIVISOR, exponentFactor / FLOAT_TO_WEI_DIVISOR) * FLOAT_TO_WEI_DIVISOR;

  if (applyExponentCache.size >= APPLY_EXPONENT_CACHE_LIMIT) {
    applyExponentCache.delete(applyExponentCache.keys().next().value!);
  }
  applyExponentCache.set(cacheKey, result);

  return result;
}
