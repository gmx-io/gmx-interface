import { BigNumber } from "ethers";

export function getPositiveOrNegativeClass(value?: BigNumber): string {
  if (!value) {
    return "";
  }
  return value.isZero() ? "" : value.isNegative() ? "text-red" : "text-green";
}
