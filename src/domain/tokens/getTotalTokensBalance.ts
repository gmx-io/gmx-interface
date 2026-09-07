import type { ContractsChainId } from "config/chains";
import { getHasBalanceOutsideWallet } from "domain/multichain/getHasBalanceOutsideWallet";
import { MultichainMarketTokensBalances } from "domain/multichain/types";
import { TokensData } from "domain/synthetics/tokens/types";
import { sumBigInts } from "lib/sumBigInts";

export type TotalTokensBalance = {
  balance: bigint;
  balanceUsd: bigint;
  hasBalanceOutsideWallet: boolean;
};

export function getTotalTokensBalance({
  tokensData,
  tokenSymbols,
  multichainMarketTokensBalances,
  chainId,
}: {
  tokensData: TokensData | undefined;
  tokenSymbols: string[];
  multichainMarketTokensBalances: MultichainMarketTokensBalances | undefined;
  chainId: ContractsChainId;
}): TotalTokensBalance {
  const result: TotalTokensBalance = {
    balance: 0n,
    balanceUsd: 0n,
    hasBalanceOutsideWallet: false,
  };

  if (!tokensData) {
    return result;
  }

  for (const token of Object.values(tokensData)) {
    if (!tokenSymbols.includes(token.symbol)) {
      continue;
    }

    const multichainBalances = multichainMarketTokensBalances?.[token.address];

    result.balance = sumBigInts(result.balance, multichainBalances?.totalBalance);
    result.balanceUsd = sumBigInts(result.balanceUsd, multichainBalances?.totalBalanceUsd);

    if (getHasBalanceOutsideWallet(multichainBalances, chainId)) {
      result.hasBalanceOutsideWallet = true;
    }
  }

  return result;
}
