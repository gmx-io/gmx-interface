export function sumBigInts(...args: (bigint | number | undefined)[]) {
  let sum = 0n;
  for (const arg of args) {
    sum += BigInt(arg ?? 0n);
  }
  return sum;
}

// unknown if any part is unknown: a network whose half has not loaded must not settle as a number
export function sumKnownBigInts(...args: (bigint | number | undefined)[]): bigint | undefined {
  let sum = 0n;
  for (const arg of args) {
    if (arg === undefined) {
      return undefined;
    }
    sum += BigInt(arg);
  }
  return sum;
}
