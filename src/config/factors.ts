export const USD_DECIMALS = 30;

export const BASIS_POINTS_DIVISOR = 10000;
export const BASIS_POINTS_DIVISOR_BIGINT = 10000n;
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

export const DEFAULT_SLIPPAGE_AMOUNT = 30; // 0.3%
export const DEFAULT_HIGHER_SLIPPAGE_AMOUNT = 100; // 1%
export const EXCESSIVE_SLIPPAGE_AMOUNT = 2 * 100; // 2%

// V2
export const HIGH_PRICE_IMPACT_BPS = 80; // 0.8%
export const HIGH_POSITION_IMPACT_BPS = 50; // 0.5%
export const HIGH_COLLATERAL_IMPACT_BPS = 500; // 5%
export const HIGH_SWAP_IMPACT_BPS = 50; // 0.5%
export const DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER = 30; // 0.3%
