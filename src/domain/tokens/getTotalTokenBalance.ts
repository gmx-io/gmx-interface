import { TokensData } from "domain/synthetics/tokens/types";
import { convertToUsd } from "domain/synthetics/tokens/utils";

export function getTotalTokenBalance(tokensData: TokensData | undefined, tokenSymbol: string) {
  const defaultResult = {
    balance: 0n,
    balanceUsd: 0n,
  };

  if (!tokensData) {
    return defaultResult;
  }

  const tokens = Object.values(tokensData).filter((token) => token.symbol === tokenSymbol);

  return tokens.reduce((acc, token) => {
    const balanceUsd = convertToUsd(token.balance, token.decimals, token.prices.minPrice);
    acc.balance = acc.balance + (token.balance ?? 0n);
    acc.balanceUsd = acc.balanceUsd + (balanceUsd ?? 0n);
    return acc;
  }, defaultResult);
}
