import { BASIS_POINTS_DIVISOR } from "./factors";

export * from "sdk/configs/factors";

export const FACTOR_TO_PERCENT_MULTIPLIER_BIGINT = 100n;

/**
 * @deprecated for v2: calculate leverage based on marketInfo.minCollateralFactor
 */
export const MAX_LEVERAGE = 100 * BASIS_POINTS_DIVISOR;
/**
 * @deprecated for v2: calculate leverage based on marketInfo.minCollateralFactor
 */
export const MAX_ALLOWED_LEVERAGE = 50 * BASIS_POINTS_DIVISOR;

export const COLLATERAL_SPREAD_SHOW_AFTER_INITIAL_ZERO_THRESHOLD = 5; // 0.05%

export const DEFAULT_SLIPPAGE_AMOUNT = 100; // 1%
export const DEFAULT_HIGHER_SLIPPAGE_AMOUNT = 100; // 1%
export const EXCESSIVE_SLIPPAGE_AMOUNT = 2 * 100; // 2%

// V2
export const HIGH_ACCEPTABLE_POSITION_IMPACT_BPS = 50; // 0.5%
export const HIGH_SWAP_PROFIT_FEE_BPS = 100; // 1%
