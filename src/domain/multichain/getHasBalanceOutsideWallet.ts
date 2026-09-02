import type { ContractsChainId } from "config/chains";
import type { MultichainMarketTokenBalances } from "domain/multichain/types";

export function getHasBalanceOutsideWallet(
  multichainBalances: MultichainMarketTokenBalances | undefined,
  chainId: ContractsChainId
): boolean {
  if (!multichainBalances) {
    return false;
  }

  const walletBalance = multichainBalances.balances[chainId]?.balance ?? 0n;

  return multichainBalances.totalBalance > walletBalance;
}
