import { Token } from "types/tokens";
import { expandDecimals, USD_DECIMALS } from "utils/numbers";
import { periodToSeconds } from "utils/time";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BOTANIX, MEGAETH, ContractsChainId } from "./chains";
import { getTokenBySymbol, getWrappedToken } from "./tokens";

export const SUBACCOUNT_MESSAGE =
  "Generate a GMX 1CT (One-Click Trading) session. Only sign this message on a trusted website.";
export const SUBACCOUNT_DOCS_URL = "https://docs.gmx.io/docs/trading/#one-click-trading";

export const DEFAULT_SUBACCOUNT_EXPIRY_DURATION = periodToSeconds(7, "1d"); // 1 week
export const DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT = 90;

export const DEFAULT_PERMIT_DEADLINE_DURATION = periodToSeconds(1, "1h");
export const DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION = periodToSeconds(1, "1h");

export const MIN_GELATO_USD_BALANCE_FOR_SPONSORED_CALL = expandDecimals(100, USD_DECIMALS); // 100$
export const MIN_RELAYER_FEE_USD = 5n ** BigInt(USD_DECIMALS - 1); // 0.5$

export const EXPRESS_EXTRA_EXECUTION_FEE_BUFFER_BPS = 1000;

export const EXPRESS_DEFAULT_MIN_RESIDUAL_USD_NUMBER = 20;
export const EXPRESS_DEFAULT_MIN_RESIDUAL_USD = expandDecimals(EXPRESS_DEFAULT_MIN_RESIDUAL_USD_NUMBER, USD_DECIMALS);
const EXPRESS_DEFAULT_MAX_RESIDUAL_USD_NUMBER = 40;
export const EXPRESS_DEFAULT_MAX_RESIDUAL_USD = expandDecimals(EXPRESS_DEFAULT_MAX_RESIDUAL_USD_NUMBER, USD_DECIMALS);
export const EXPRESS_RESIDUAL_AMOUNT_MULTIPLIER = 20n;

const GAS_PAYMENT_TOKENS: Record<ContractsChainId, string[]> = {
  [ARBITRUM]: [
    getTokenBySymbol(ARBITRUM, "USDC").address,
    getTokenBySymbol(ARBITRUM, "WETH").address,
    getTokenBySymbol(ARBITRUM, "USDT").address,
  ],
  [AVALANCHE]: [
    getTokenBySymbol(AVALANCHE, "USDC").address,
    getTokenBySymbol(AVALANCHE, "WAVAX").address,
    getTokenBySymbol(AVALANCHE, "USDT").address,
  ],
  [AVALANCHE_FUJI]: [
    getTokenBySymbol(AVALANCHE_FUJI, "USDC").address,
    getTokenBySymbol(AVALANCHE_FUJI, "WAVAX").address,
  ],
  [ARBITRUM_SEPOLIA]: [
    getTokenBySymbol(ARBITRUM_SEPOLIA, "USDC.SG").address,
    getTokenBySymbol(ARBITRUM_SEPOLIA, "WETH").address,
  ],
  [BOTANIX]: [getTokenBySymbol(BOTANIX, "pBTC").address],
  // TODO: Add gas payment tokens for MegaETH when express is enabled
  [MEGAETH]: [],
};

export function getGasPaymentTokens(chainId: number): string[] {
  return GAS_PAYMENT_TOKENS[chainId];
}

export function getDefaultGasPaymentToken(chainId: number): string {
  return GAS_PAYMENT_TOKENS[chainId][0];
}

export function getRelayerFeeToken(chainId: number): Token {
  return getWrappedToken(chainId);
}
