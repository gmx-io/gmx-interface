export function sumBigInts(...args: (bigint | number | undefined)[]) {
  let sum = 0n;
  for (const arg of args) {
    sum += BigInt(arg ?? 0n);
  }
  return sum;
}

// unknown if any part is unknown: a network whose half has not loaded must not settle as a number
export function sumKnownBigInts(...args: (bigint | number | undefined)[]): bigint | undefined {
  if (args.some((arg) => arg === undefined)) {
    return undefined;
  }

  return args.reduce<bigint>((sum, arg) => sum + BigInt(arg!), 0n);
}
