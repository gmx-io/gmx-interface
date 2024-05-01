import { BigNumber } from "ethers";

export function getPositiveOrNegativeClass(value?: bigint, zeroValue: "" | "text-red" | "text-green" = ""): string {
  if (!value) {
    return "";
  }
  return value.isZero() ? zeroValue : value.isNegative() ? "text-red" : "text-green";
}

export function getPlusOrMinusSymbol(value?: bigint, opts: { showPlusForZero?: boolean } = {}): string {
  if (!value) {
    return "";
  }

  const { showPlusForZero = false } = opts;
  return value.isZero() ? (showPlusForZero ? "+" : "") : value.isNegative() ? "-" : "+";
}
