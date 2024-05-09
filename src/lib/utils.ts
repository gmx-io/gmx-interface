import { BigNumber } from "ethers";

export function getPositiveOrNegativeClass(
  value?: BigNumber,
  zeroValue: "" | "text-red-500" | "text-green-500" = ""
): string {
  if (!value) {
    return "";
  }
  return value.isZero() ? zeroValue : value.isNegative() ? "text-red-500" : "text-green-500";
}

export function getPlusOrMinusSymbol(value?: BigNumber, opts: { showPlusForZero?: boolean } = {}): string {
  if (!value) {
    return "";
  }

  const { showPlusForZero = false } = opts;
  return value.isZero() ? (showPlusForZero ? "+" : "") : value.isNegative() ? "-" : "+";
}
