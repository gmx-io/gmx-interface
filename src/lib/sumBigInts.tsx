export function sumBigInts(...args: (bigint | number | undefined)[]) {
  let sum = 0n;
  for (const arg of args) {
    sum += BigInt(arg ?? 0n);
  }
  return sum;
}
