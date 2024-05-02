export function getPositiveOrNegativeClass(value?: bigint, zeroValue: "" | "text-red" | "text-green" = ""): string {
  if (value === undefined) {
    return "";
  }
  return value === 0n ? zeroValue : value < 0n ? "text-red" : "text-green";
}

export function getPlusOrMinusSymbol(value?: bigint, opts: { showPlusForZero?: boolean } = {}): string {
  if (value === undefined) {
    return "";
  }

  const { showPlusForZero = false } = opts;
  return value === 0n ? (showPlusForZero ? "+" : "") : value < 0n ? "-" : "+";
}
