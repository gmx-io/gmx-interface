import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "./chains";
import { getTokenBySymbol } from "./tokens";

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

export function getDefaultGasPaymentToken(chainId: number): string | undefined {
  return GAS_PAYMENT_TOKENS[chainId]?.[0];
}
