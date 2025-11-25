import { TokensData } from "domain/synthetics/tokens/types";
import { convertToUsd } from "domain/synthetics/tokens/utils";
import { EMPTY_ARRAY } from "lib/objects";
import { sumBigInts } from "lib/sumBigInts";

export function getTotalTokensBalance(
  tokensData: TokensData | undefined,
  tokenSymbols: string[],
  multichainMarketTokensBalances?: Partial<Record<number, Partial<Record<string, bigint>>>>
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
    const multichainMarketTokenBalances = multichainMarketTokensBalances
      ? Object.values(multichainMarketTokensBalances).map((balances) => balances?.[token.address])
      : EMPTY_ARRAY;

    acc.balance = sumBigInts(
      acc.balance,
      token.walletBalance,
      token.gmxAccountBalance,
      ...multichainMarketTokenBalances
    );
    const balanceUsd = convertToUsd(token.balance, token.decimals, token.prices.minPrice);
    acc.balanceUsd = sumBigInts(acc.balanceUsd, balanceUsd);
    return acc;
  }, defaultResult);
}
