import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, BASE_MAINNET, SONIC_MAINNET } from "config/chains";

export const CHAIN_ID_TO_TX_URL_BUILDER: Record<number, (txId: string) => string> = {
  [ARBITRUM]: (txId: string) => `https://arbiscan.io/tx/${txId}`,
  [AVALANCHE]: (txId: string) => `https://snowtrace.io/tx/${txId}`,
  [BASE_MAINNET]: (txId: string) => `https://basescan.org/tx/${txId}`,
  [SONIC_MAINNET]: (txId: string) => `https://sonicscan.org/tx/${txId}`,
};

export const CHAIN_ID_TO_EXPLORER_NAME: Record<number, string> = {
  [ARBITRUM]: "Arbiscan",
  [ARBITRUM_SEPOLIA]: "Arbiscan",
  [AVALANCHE]: "Snowtrace",
  [BASE_MAINNET]: "Basescan",
  [SONIC_MAINNET]: "Sonicscan",
};
