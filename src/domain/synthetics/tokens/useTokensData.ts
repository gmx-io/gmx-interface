import { getAvailableTradeTokens, getTokensMap } from "config/tokens";
import { useMemo } from "react";
import { TokensData } from "./types";
import { useTokenBalancesData } from "./useTokenBalancesData";
import { useTokenRecentPricesData } from "./useTokenRecentPricesData";

type TokensDataResult = {
  tokensData: TokensData;
  isLoading: boolean;
};

export function useAvailableTokensData(chainId: number): TokensDataResult {
  const tokenAddresses = getAvailableTradeTokens(chainId, { includeSynthetic: true }).map((token) => token.address);

  return useTokensData(chainId, { tokenAddresses });
}

export function useTokensData(chainId: number, p: { tokenAddresses: string[] }): TokensDataResult {
  const { balancesData, isLoading: isBalancesLoading } = useTokenBalancesData(chainId, {
    tokenAddresses: p.tokenAddresses,
  });

  const { pricesData: tokenPricesData, isLoading: isPricesLoading } = useTokenRecentPricesData(chainId);
  const tokenConfigs = getTokensMap(chainId);

  return useMemo(() => {
    return {
      tokensData: p.tokenAddresses.reduce((tokensData: TokensData, tokenAddress) => {
        tokensData[tokenAddress] = {
          ...tokenConfigs[tokenAddress],
          prices: tokenPricesData[tokenAddress],
          balance: balancesData[tokenAddress],
        };
        return tokensData;
      }, {} as TokensData),
      isLoading: isBalancesLoading || isPricesLoading,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.tokenAddresses.join(), tokenConfigs]);
}
