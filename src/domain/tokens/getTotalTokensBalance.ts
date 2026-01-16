import type { MultichainMarketTokensBalances } from "domain/multichain/types";
import type { TokensData } from "domain/synthetics/tokens/types";
import { sumBigInts } from "lib/sumBigInts";

export function getTotalTokensBalance(
  tokensData: TokensData | undefined,
  tokenSymbols: string[],
  multichainMarketTokensBalances?: MultichainMarketTokensBalances
): { balance: bigint; balanceUsd: bigint } {
  const defaultResult = {
    balance: 0n,
    balanceUsd: 0n,
  };

  if (!tokensData) {
    return defaultResult;
  }

  const tokens = Object.values(tokensData).filter((token) => tokenSymbols.includes(token.symbol));

  return tokens.reduce((acc, token) => {
    const balance = multichainMarketTokensBalances?.[token.address]?.totalBalance;
    const balanceUsd = multichainMarketTokensBalances?.[token.address]?.totalBalanceUsd;
    acc.balance = sumBigInts(acc.balance, balance);
    acc.balanceUsd = sumBigInts(acc.balanceUsd, balanceUsd);
    return acc;
  }, defaultResult);
}
