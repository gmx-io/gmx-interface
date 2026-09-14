import type { ContractsChainId } from "config/chains";
import { PLATFORM_TOKEN_BALANCE_THRESHOLD_USD } from "domain/multichain/getPlatformTokenBalanceAfterThreshold";
import type { MultichainMarketTokenBalances } from "domain/multichain/types";

export function getHasBalanceOutsideWallet(
  multichainBalances: MultichainMarketTokenBalances | undefined,
  chainId: ContractsChainId
): boolean {
  if (!multichainBalances) {
    return false;
  }

  const walletBalances = multichainBalances.balances[chainId];
  const balanceOutsideWallet = multichainBalances.totalBalance - (walletBalances?.balance ?? 0n);

  if (balanceOutsideWallet <= 0n) {
    return false;
  }

  const balanceOutsideWalletUsd = multichainBalances.totalBalanceUsd - (walletBalances?.balanceUsd ?? 0n);
  const isPriced = balanceOutsideWalletUsd > 0n;
  const isDust = isPriced && balanceOutsideWalletUsd < PLATFORM_TOKEN_BALANCE_THRESHOLD_USD;

  return !isDust;
}
