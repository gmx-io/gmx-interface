import { AVALANCHE, BOTANIX, MEGAETH } from "config/chains";
import type { ContractsChainId, SourceChainId } from "config/chains";

export type AccountModalMode = "walletAndGmxAccount" | "gmxAccount" | "walletOnly";

// TODO(FEDEV-3882): hardcoded network mode — needs review before release.
// Consider reusing the settlement/source-chain predicates from NetworkDropdown
// (isValidVisualSettlementChain / isValidVisualSourceChain) instead of this list.
const WALLET_ONLY_CHAIN_IDS: number[] = [AVALANCHE, BOTANIX, MEGAETH];

export function getAccountModalMode(
  chainId: ContractsChainId,
  srcChainId: SourceChainId | undefined
): AccountModalMode {
  if (WALLET_ONLY_CHAIN_IDS.includes(chainId)) {
    return "walletOnly";
  }

  if (srcChainId !== undefined) {
    return "gmxAccount";
  }

  return "walletAndGmxAccount";
}

export function isWalletOnlyChain(chainId: number): boolean {
  return WALLET_ONLY_CHAIN_IDS.includes(chainId);
}
