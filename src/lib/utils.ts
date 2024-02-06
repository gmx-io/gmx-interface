import { BigNumber } from "ethers";

export function getPositiveOrNegativeClass(value?: BigNumber, zeroValue: "" | "text-red" | "text-green" = ""): string {
  if (!value) {
    return "";
  }
  return value.isZero() ? zeroValue : value.isNegative() ? "text-red" : "text-green";
}

export function getPlusOrMinusSymbol(value?: BigNumber, opts: { showPlusForZero?: boolean } = {}): string {
  if (!value) {
    return "";
  }

  const { showPlusForZero = false } = opts;
  return value.isZero() ? (showPlusForZero ? "+" : "") : value.isNegative() ? "-" : "+";
}
