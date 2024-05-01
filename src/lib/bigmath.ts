export const bigMath = {
  abs(x: bigint) {
    return x < 0n ? -x : x;
  },
  sign(x: bigint): number {
    if (x === 0n) return 0;
    return x < 0n ? -1 : 1;
  },
  mulDiv(x: bigint, y: bigint, z: bigint) {
    return (x * y) / z;
  },
};
