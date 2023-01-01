import { getAvailableTradeTokens, getTokensMap } from "config/tokens";
import { useMemo } from "react";
import { TokensData } from "./types";
import { useTokenBalancesData } from "./useTokenBalancesData";
import { useTokenRecentPricesData } from "./useTokenRecentPricesData";

export function useAvailableTokensData(chainId: number) {
  const tokenAddresses = getAvailableTradeTokens(chainId, { includeSynthetic: true }).map((token) => token.address);

  return useTokensData(chainId, { tokenAddresses });
}

export function useTokensData(chainId: number, p: { tokenAddresses: string[] }): TokensData {
  const balancesData = useTokenBalancesData(chainId, { tokenAddresses: p.tokenAddresses });
  const pricesData = useTokenRecentPricesData(chainId);
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [balancesData, p.tokenAddresses.join("-"), pricesData, tokenConfigs]
  );
}
