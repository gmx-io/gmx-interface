import { base, optimismSepolia, sonic, arbitrumSepolia } from "viem/chains";

import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  BASE_MAINNET,
  OPTIMISM_SEPOLIA,
  SONIC_MAINNET,
  UiSupportedChain,
  getExplorerUrl,
} from "config/chains";

export const CHAIN_ID_TO_TX_URL_BUILDER: Record<UiSupportedChain, (txId: string) => string> = {
  [ARBITRUM]: (txId: string) => `${getExplorerUrl(ARBITRUM)}tx/${txId}`,
  [AVALANCHE]: (txId: string) => `${getExplorerUrl(AVALANCHE)}tx/${txId}`,
  [BASE_MAINNET]: (txId: string) => `${getExplorerUrl(BASE_MAINNET)}tx/${txId}`,
  [SONIC_MAINNET]: (txId: string) => `${getExplorerUrl(SONIC_MAINNET)}tx/${txId}`,
  [OPTIMISM_SEPOLIA]: (txId: string) => `${getExplorerUrl(OPTIMISM_SEPOLIA)}tx/${txId}`,
  [ARBITRUM_SEPOLIA]: (txId: string) => `${getExplorerUrl(ARBITRUM_SEPOLIA)}tx/${txId}`,
  [AVALANCHE_FUJI]: (txId: string) => `${getExplorerUrl(AVALANCHE_FUJI)}tx/${txId}`,
};

export const CHAIN_ID_TO_EXPLORER_NAME: Record<UiSupportedChain, string> = {
  [ARBITRUM]: "Arbiscan",
  [AVALANCHE]: "Snowtrace",
  [AVALANCHE_FUJI]: "Snowtrace",
  [ARBITRUM_SEPOLIA]: arbitrumSepolia.blockExplorers.default.name,
  [BASE_MAINNET]: base.blockExplorers.default.name,
  [SONIC_MAINNET]: sonic.blockExplorers.default.name,
  [OPTIMISM_SEPOLIA]: "OP Sepolia Etherscan",
};
