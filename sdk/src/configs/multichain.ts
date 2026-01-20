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
