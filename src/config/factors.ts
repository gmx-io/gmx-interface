import { expandDecimals } from "lib/numbers";

export const BASIS_POINTS_DIVISOR = 10000;

export const MAX_LEVERAGE = 100 * BASIS_POINTS_DIVISOR;
export const MAX_ALLOWED_LEVERAGE = 50 * BASIS_POINTS_DIVISOR;
export const HIGH_SPREAD_THRESHOLD = expandDecimals(1, 30).div(100); // 1%

export const DEFAULT_SLIPPAGE_AMOUNT = 30;
export const DEFAULT_HIGHER_SLIPPAGE_AMOUNT = 100;

// V2
export const HIGH_PRICE_IMPACT_BPS = 80; // 0.8%
export const DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS = 100; // 1%
