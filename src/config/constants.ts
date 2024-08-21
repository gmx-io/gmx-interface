import { USD_DECIMALS } from "config/factors";
import { expandDecimals } from "lib/numbers";

export const HIGH_SPREAD_THRESHOLD = expandDecimals(1, USD_DECIMALS) / 100n; // 1%;
export const HIGH_TRADE_VOLUME_FOR_FEEDBACK = expandDecimals(1_000_000, 30); // 1mx
