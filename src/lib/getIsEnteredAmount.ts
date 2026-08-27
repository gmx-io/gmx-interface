import { USD_DECIMALS } from "config/factors";
import { parseValue } from "lib/numbers";

/** Whether an amount field holds something the user typed. Untouched fields hold "", "0" or "0.00". */
export function getIsEnteredAmount(inputValue: string | undefined) {
  const amount = parseValue(inputValue ?? "", USD_DECIMALS);
  return amount !== undefined && amount > 0n;
}
