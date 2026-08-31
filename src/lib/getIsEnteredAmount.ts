import { USD_DECIMALS } from "config/factors";
import { parseValue } from "lib/numbers";

/** Untouched amount fields hold "", "0" or "0.00". */
export function getIsEnteredAmount(inputValue: string | undefined) {
  const amount = parseValue(inputValue ?? "", USD_DECIMALS);
  return amount !== undefined && amount > 0n;
}
