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
    for (const value of values) {
      if (value !== undefined) {
        sum += value;
      }
    }

    return sum / BigInt(values.length);
  },
};
