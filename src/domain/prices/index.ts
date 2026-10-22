import { MaxInt256 } from "lib/numbers";

export function isBoundaryAcceptablePrice(acceptablePrice: bigint): boolean {
  return acceptablePrice === 0n || acceptablePrice >= MaxInt256;
}
