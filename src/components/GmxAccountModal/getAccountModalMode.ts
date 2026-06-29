import type { ContractsChainId, SourceChainId } from "config/chains";
import { isValidVisualSettlementChain } from "config/multichain";

export type AccountModalMode = "walletAndGmxAccount" | "gmxAccount" | "walletOnly";

export function getAccountModalMode(
  chainId: ContractsChainId,
  srcChainId: SourceChainId | undefined
): AccountModalMode {
  if (!isValidVisualSettlementChain(chainId)) {
    return "walletOnly";
  }

  if (srcChainId !== undefined) {
    return "gmxAccount";
  }

  return "walletAndGmxAccount";
}

export function isWalletOnlyChain(chainId: number): boolean {
  return !isValidVisualSettlementChain(chainId);
}
