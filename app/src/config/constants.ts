import { getUnit } from '@/utils/legacy/common';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

// constants for BN
export const BN_ZERO = new BN(0);
export const BN_ONE = new BN(1);
export const BN_NEG_ONE = new BN(1).neg();
export const BN_TWO = new BN(2);
export const BN_10 = new BN(10);
export const BN_50 = new BN(50);
export const BN_100 = new BN(100);
export const BN_1000 = new BN(1000);
export const BN_10000 = new BN(10000);
export const BN_100000 = new BN(100000);
export const BN_100000000 = new BN(100000000);
export const SLIDER_MARKS = {
  0: '0%',
  25: '',
  50: '50%',
  75: '',
  100: '100%'
};
export const LEVERAGE_SLIDER_MARKS = {
  0.1: '0.1x',
};
// constants for decimals
export const GM_DECIMALS = 9;
export const USD_DECIMALS = 20;
export const MARKET_STATS_DECIMALS = 4;
export const FUNDING_AMOUNT_PER_SIZE_ADJUSTMENT = getUnit(USD_DECIMALS / 2);

// constants for USD
export const MAX_SIGNED_USD = new BN('170141183460469231731687303715884105727');
export const MIN_SIGNED_USD = new BN(
  '-170141183460469231731687303715884105728'
);
export const ONE_USD = getUnit(USD_DECIMALS);
export const DUST_USD = ONE_USD.div(BN_100000); // 0.00001 USD

export const MAX_SUPPLY = BN_TWO.pow(new BN(64));

// constants for BPS
export const ONE_BPS = ONE_USD.div(BN_10000);
export const BASIS_POINTS_DIVISOR_BN = BN_10000;

// constants for execution fee
export const ESTIMATED_EXECUTION_FEE = new BN(45000);
export const DEFAULT_RENT_EXEMPT_FEE_FOR_ZERO = new BN(890880);

// constants for collateral
export const MIN_COLLATERAL_USD = ONE_USD.muln(2);
export const MIN_POSITION_SIZE_USD = ONE_USD.muln(2);

// constants for CU
export const DEFAULT_CU = 200000;
export const DEFAULT_CU_PRICE = 80000;

// constants for chart periods
export const CHART_PERIODS = {
  '1m': 60,
  '5m': 60 * 5,
  '15m': 60 * 15,
  '1h': 60 * 60,
  '4h': 60 * 60 * 4,
  '1d': 60 * 60 * 24,
  '1y': 60 * 60 * 24 * 365,
};

const ALT_ONE = new PublicKey(
  (import.meta.env.VITE_GMX_SOLANA_ALT_ONE as string) || ''
);
const ALT_TWO = new PublicKey(
  (import.meta.env.VITE_GMX_SOLANA_ALT_TWO as string) || ''
);
export const lookupTables = [ALT_ONE, ALT_TWO];
