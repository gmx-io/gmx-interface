export const bigMath = {
  abs(x: bigint) {
    return x < 0n ? -x : x;
  },
  mulDiv(x: bigint, y: bigint, z: bigint, roundUpMagnitude = false) {
    const result = (x * y) / z;

    if (roundUpMagnitude && this.mulmod(x, y, z) > 0n) {
      return result + 1n;
    }

    return result;
  },
  max(max: bigint, ...rest: bigint[]) {
    return rest.reduce((currentMax, val) => (currentMax < val ? val : currentMax), max);
  },
  min(min: bigint, ...rest: bigint[]) {
    return rest.reduce((currentMin, val) => (currentMin > val ? val : currentMin), min);
  },
  avg(...values: (bigint | undefined)[]) {
    let sum = 0n;
    let count = 0n;
    for (const value of values) {
      if (value !== undefined) {
        sum += value;
        count += 1n;
      }
    }

    if (count === 0n) {
      return undefined;
    }

    return sum / count;
  },
  divRound(x: bigint, y: bigint) {
    return x / y + ((x % y) * 2n > y ? 1n : 0n);
  },
  divRoundUp(x: bigint, y: bigint) {
    return (x + y - 1n) / y;
  },
  mulmod(x: bigint, y: bigint, m: bigint): bigint {
    return (x * y) % m;
  },
  clamp(value: bigint, min: bigint, max: bigint): bigint {
    return bigMath.max(min, bigMath.min(value, max));
  },
};
