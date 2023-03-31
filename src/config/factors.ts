import { expandDecimals } from "lib/numbers";

export const HIGH_SPREAD_THRESHOLD = expandDecimals(1, 30).div(100); // 1%

// V2
export const HIGH_PRICE_IMPACT_BPS = 80; // 0.8%
export const DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS = 100; // 1%;
