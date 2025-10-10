import {
  ARBITRUM_SEPOLIA,
  ARBITRUM,
  AVALANCHE,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
} from "./chainIds";
import { SettlementChainId, SourceChainId } from "./chains";

function ensureExhaustive<T extends number>(value: Record<T, true>): T[] {
  return Object.keys(value).map(Number) as T[];
}

export const SETTLEMENT_CHAINS: SettlementChainId[] = ensureExhaustive<SettlementChainId>({
  [ARBITRUM_SEPOLIA]: true,
  [ARBITRUM]: true,
  [AVALANCHE]: true,
});

export const SOURCE_CHAINS: SourceChainId[] = ensureExhaustive<SourceChainId>({
  [SOURCE_OPTIMISM_SEPOLIA]: true,
  [SOURCE_SEPOLIA]: true,
  [SOURCE_BASE_MAINNET]: true,
  [SOURCE_BSC_MAINNET]: true,
});

export function isSettlementChain(chainId: number): chainId is SettlementChainId {
  return SETTLEMENT_CHAINS.includes(chainId as SettlementChainId);
}

export function isSourceChain(chainId: number | undefined): chainId is SourceChainId {
  return SOURCE_CHAINS.includes(chainId as SourceChainId);
}
