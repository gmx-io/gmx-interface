export function getPositiveOrNegativeClass(
  value?: bigint,
  zeroValue: "" | "text-red-strong" | "text-green-strong" = ""
): string {
  if (value === undefined) {
    return "";
  }
  return value === 0n ? zeroValue : value < 0n ? "text-red-strong" : "text-green-strong";
}
