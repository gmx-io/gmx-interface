export const bigMath = {
  abs(x: bigint) {
    return x < 0n ? -x : x;
  },
  mulDiv(x: bigint, y: bigint, z: bigint) {
    return (x * y) / z;
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
};
