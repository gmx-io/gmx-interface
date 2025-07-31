import { arbitrumSepolia, base } from "viem/chains";

import {
  AnyChainId,
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  BOTANIX,
  getExplorerUrl,
  SOURCE_BASE_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
} from "config/chains";

export const CHAIN_ID_TO_TX_URL_BUILDER: Record<AnyChainId, (txId: string) => string> = {
  [ARBITRUM]: (txId: string) => `${getExplorerUrl(ARBITRUM)}tx/${txId}`,
  [AVALANCHE]: (txId: string) => `${getExplorerUrl(AVALANCHE)}tx/${txId}`,
  [SOURCE_BASE_MAINNET]: (txId: string) => `${getExplorerUrl(SOURCE_BASE_MAINNET)}tx/${txId}`,
  [SOURCE_OPTIMISM_SEPOLIA]: (txId: string) => `${getExplorerUrl(SOURCE_OPTIMISM_SEPOLIA)}tx/${txId}`,
  [ARBITRUM_SEPOLIA]: (txId: string) => `${getExplorerUrl(ARBITRUM_SEPOLIA)}tx/${txId}`,
  [AVALANCHE_FUJI]: (txId: string) => `${getExplorerUrl(AVALANCHE_FUJI)}tx/${txId}`,
  [SOURCE_SEPOLIA]: (txId: string) => `${getExplorerUrl(SOURCE_SEPOLIA)}tx/${txId}`,
  [BOTANIX]: (txId: string) => `${getExplorerUrl(BOTANIX)}tx/${txId}`,
};

export const CHAIN_ID_TO_EXPLORER_NAME: Record<AnyChainId, string> = {
  [ARBITRUM]: "Arbiscan",
  [AVALANCHE]: "Snowtrace",
  [AVALANCHE_FUJI]: "Snowtrace",
  [ARBITRUM_SEPOLIA]: arbitrumSepolia.blockExplorers.default.name,
  [SOURCE_BASE_MAINNET]: base.blockExplorers.default.name,
  [SOURCE_OPTIMISM_SEPOLIA]: "OP Sepolia Etherscan",
  [SOURCE_SEPOLIA]: "Sepolia Etherscan",
  [BOTANIX]: "Botanix Explorer",
};
