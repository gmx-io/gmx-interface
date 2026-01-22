export function getPositiveOrNegativeClass(
  value?: bigint,
  zeroValue: "" | "text-red-500" | "text-green-500" = ""
): string {
  if (value === undefined) {
    return "";
  }
  return value === 0n ? zeroValue : value < 0n ? "text-red-500" : "text-green-500";
}
