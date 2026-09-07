import { USD_DECIMALS } from "config/factors";
import { roundWithDecimals } from "lib/numbers";

const EARNINGS_DISPLAY_DECIMALS = 2;

export function roundEarningsUsd(usd: bigint): bigint {
  return roundWithDecimals(usd, { displayDecimals: EARNINGS_DISPLAY_DECIMALS, decimals: USD_DECIMALS });
}
