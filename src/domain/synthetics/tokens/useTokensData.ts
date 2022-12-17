import { getAvailableTradeTokens, getTokensMap } from "config/tokens";
import { useMemo } from "react";
import { TokensData } from "./types";
import { useTokenBalances } from "./useTokenBalances";
import { useTokenRecentPrices } from "./useTokenRecentPrices";

export function useAvailableTradeTokensData(chainId: number) {
  const tokenAddresses = getAvailableTradeTokens(chainId, { includeSynthetic: true }).map((token) => token.address);

  return useTokensData(chainId, { tokenAddresses });
}

export function useTokensData(chainId: number, p: { tokenAddresses: string[] }): TokensData {
  const balancesData = useTokenBalances(chainId, { tokenAddresses: p.tokenAddresses });
  const pricesData = useTokenRecentPrices(chainId);
  const tokenConfigs = getTokensMap(chainId);

  return useMemo(
    () =>
      p.tokenAddresses.reduce((tokensData, tokenAddress) => {
        const token = tokenConfigs[tokenAddress];

        tokensData[token.address] = {
          ...token,
          prices: pricesData[token.address],
          balance: balancesData[token.address],
        };
        return tokensData;
      }, {}),
    [balancesData, p.tokenAddresses, pricesData, tokenConfigs]
  );
}
