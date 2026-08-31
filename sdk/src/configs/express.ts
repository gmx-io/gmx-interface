import { periodToSeconds } from "utils/time";
import { Token } from "utils/tokens/types";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, MEGAETH, ContractsChainId } from "./chains";
import { getTokenBySymbol, getWrappedToken } from "./tokens";

export const SUBACCOUNT_MESSAGE =
  "Generate a GMX 1CT (One-Click Trading) session. Only sign this message on a trusted website.";
export const SUBACCOUNT_DOCS_URL = "https://docs.gmx.io/docs/trading/overview/#express-trading-and-one-click-trading";

export const DEFAULT_SUBACCOUNT_EXPIRY_DURATION = periodToSeconds(7, "1d"); // 1 week
export const DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT = 90;

export const DEFAULT_PERMIT_DEADLINE_DURATION = periodToSeconds(1, "1h");
export const DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION = periodToSeconds(1, "1h");

export const EXPRESS_EXTRA_EXECUTION_FEE_BUFFER_BPS = 1000;

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
  [MEGAETH]: [getTokenBySymbol(MEGAETH, "USDM").address, getTokenBySymbol(MEGAETH, "WETH").address],
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
