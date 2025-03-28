import { Token } from "types/tokens";
import { periodToSeconds } from "utils/time";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "./chains";
import { getTokenBySymbol, getWrappedToken } from "./tokens";

export const SUBACCOUNT_MESSAGE = "Generate a GMX subaccount. Only sign this message on a trusted website.";
export const SUBACCOUNT_DOCS_URL = "https://docs.gmx.io/docs/trading/v2/#one-click-trading";

export const DEFAULT_SUBACCOUNT_EXPIRY_DURATION = periodToSeconds(7, "1d");
export const DEFAULT_SUBACCOUNT_DEADLINE_DURATION = periodToSeconds(1, "1h");
export const DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT = 10;

export const DEFAULT_PERMIT_DEADLINE_DURATION = periodToSeconds(1, "1h");

const GAS_PAYMENT_TOKENS = {
  [ARBITRUM]: [getTokenBySymbol(ARBITRUM, "USDC").address, getTokenBySymbol(ARBITRUM, "WETH").address],
  [AVALANCHE]: [getTokenBySymbol(AVALANCHE, "USDC").address, getTokenBySymbol(AVALANCHE, "WAVAX").address],
  [AVALANCHE_FUJI]: [
    getTokenBySymbol(AVALANCHE_FUJI, "USDC").address,
    getTokenBySymbol(AVALANCHE_FUJI, "WAVAX").address,
  ],
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
