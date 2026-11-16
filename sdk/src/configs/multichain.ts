import {
  ARBITRUM,
  AVALANCHE,
  AVALANCHE_FUJI,
  ARBITRUM_SEPOLIA,
  SOURCE_BASE_MAINNET,
  SOURCE_ETHEREUM_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_SEPOLIA,
  SOURCE_OPTIMISM_SEPOLIA,
} from "./chainIds";
import {
  SETTLEMENT_CHAIN_IDS,
  SETTLEMENT_CHAIN_IDS_DEV,
  SettlementChainId,
  SOURCE_CHAIN_IDS,
  SourceChainId,
} from "./chains";

export type LayerZeroEndpointId = 40161 | 40231 | 40232 | 30184 | 30110 | 30106 | 30102 | 30101 | 40106;

export const CHAIN_ID_TO_ENDPOINT_ID: Record<SettlementChainId | SourceChainId, LayerZeroEndpointId> = {
  [ARBITRUM_SEPOLIA]: 40231,
  [SOURCE_SEPOLIA]: 40161,
  [SOURCE_OPTIMISM_SEPOLIA]: 40232,
  [ARBITRUM]: 30110,
  [SOURCE_ETHEREUM_MAINNET]: 30101,
  [SOURCE_BASE_MAINNET]: 30184,
  [AVALANCHE]: 30106,
  [SOURCE_BSC_MAINNET]: 30102,
  [AVALANCHE_FUJI]: 40106,
};

export function getLayerZeroEndpointId(chainId: number): LayerZeroEndpointId | undefined {
  return CHAIN_ID_TO_ENDPOINT_ID[chainId as SettlementChainId | SourceChainId];
}

export function isSettlementChain(chainId: number): chainId is SettlementChainId {
  return SETTLEMENT_CHAIN_IDS.includes(chainId as any) || SETTLEMENT_CHAIN_IDS_DEV.includes(chainId as any);
}

const SOURCE_CHAIN_IDS_MAP: Record<SettlementChainId, SourceChainId[]> = {
  [ARBITRUM]: [SOURCE_BASE_MAINNET, SOURCE_ETHEREUM_MAINNET, SOURCE_BSC_MAINNET],
  [AVALANCHE]: [SOURCE_BASE_MAINNET, SOURCE_BSC_MAINNET],
  [AVALANCHE_FUJI]: [ARBITRUM_SEPOLIA],
  [ARBITRUM_SEPOLIA]: [SOURCE_SEPOLIA, SOURCE_OPTIMISM_SEPOLIA],
};

export function isSourceChain(
  chainId: number | undefined,
  forSettlementChain: number | undefined
): chainId is SourceChainId {
  if (!chainId || !forSettlementChain) {
    return false;
  }

  const sourceChainIds = SOURCE_CHAIN_IDS_MAP[forSettlementChain as SettlementChainId];
  if (!sourceChainIds) {
    return false;
  }

  return sourceChainIds.includes(chainId as any);
}

/**
 * Check if a chain is a source chain for any settlement chain
 * Useful when settlement chain context is not available
 */
export function isSourceChainForAnySettlementChain(chainId: number | undefined): chainId is SourceChainId {
  if (!chainId) {
    return false;
  }

  return SOURCE_CHAIN_IDS.includes(chainId as any);
}
