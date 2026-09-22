import type { ContractsChainId } from "config/chains";
import type { MultichainMarketTokenBalances } from "domain/multichain/types";

import { getPlatformTokenBalanceAfterThreshold } from "./getPlatformTokenBalanceAfterThreshold";

export function getHasBalanceOutsideWallet(
  multichainBalances: MultichainMarketTokenBalances | undefined,
  chainId: ContractsChainId
): boolean {
  if (!multichainBalances) {
    return false;
  }

  const walletBalance = multichainBalances.balances[chainId]?.balance ?? 0n;

  if (multichainBalances.totalBalance <= walletBalance) {
    return false;
  }

  // Keep fees unattributed until USD prices are available.
  if (multichainBalances.totalBalanceUsd === 0n) {
    return true;
  }

  const walletBalanceUsd = multichainBalances.balances[chainId]?.balanceUsd ?? 0n;
  const outsideWalletBalanceUsd = multichainBalances.totalBalanceUsd - walletBalanceUsd;

  return getPlatformTokenBalanceAfterThreshold(outsideWalletBalanceUsd) > 0n;
}
