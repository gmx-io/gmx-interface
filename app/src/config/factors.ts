import { BN } from '@coral-xyz/anchor';

import { ONE_USD } from './constants';

export const HIGH_PRICE_IMPACT_BPS = 80; // 0.8%
export const HIGH_POSITION_IMPACT_BPS = 50; // 0.5%
export const HIGH_COLLATERAL_IMPACT_BPS = 500; // 5%
export const HIGH_SWAP_IMPACT_BPS = 50; // 0.5%
export const HIGH_SWAP_PROFIT_FEE_BPS = 100; // 1%
export const DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER = 30; // 0.3%
export const RISK_THRESHOLD_BPS = 5000; // 50%

export const HIGH_SPREAD_THRESHOLD = 10000; // 100%

export const DEFAULT_SLIPPAGE_AMOUNT = 30; // 0.3%
export const DEFAULT_HIGHER_SLIPPAGE_AMOUNT = 100; // 1%
export const EXCESSIVE_SLIPPAGE_AMOUNT = 2 * 100; // 2%

export const MAX_EXCEEDING_THRESHOLD = '1000000000000000';
export const MIN_EXCEEDING_THRESHOLD = '0';
export const MIN_EXCEEDING_THRESHOLD_SCALE = 0;

export const MAX_ALLOWED_LEVERAGE = new BN(200).mul(ONE_USD); // 200x
export const DEFAULT_MAX_LEVERAGE = new BN(100).mul(ONE_USD); // 100x
export const DEFAULT_LEVERAGE = new BN(10).mul(ONE_USD); // 10x
export const DEFAULT_MAX_LEVERAGE_WITH_PNL = new BN(500).mul(ONE_USD); // 500x
