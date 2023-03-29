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
  const tokenAddresses = useMemo(
    () => getAvailableTradeTokens(chainId, { includeSynthetic: true }).map((token) => token.address),
    [chainId]
  );

  return useTokensData(chainId, { tokenAddresses });
}

export function useTokensData(chainId: number, p: { tokenAddresses: string[] }): TokensDataResult {
  const tokenConfigs = getTokensMap(chainId);
  const { balancesData, isLoading: isBalancesLoading } = useTokenBalancesData(chainId, {
    tokenAddresses: p.tokenAddresses,
  });
  const { pricesData, isLoading: isPricesLoading } = useTokenRecentPricesData(chainId);

  const tokenKeys = p.tokenAddresses.join("-");

  return useMemo(() => {
    if (!pricesData) {
      return {
        tokensData: {},
        isLoading: true,
      };
    }

    return {
      tokensData: tokenKeys.split("-").reduce((acc: TokensData, tokenAddress) => {
        const prices = pricesData[tokenAddress];

        if (!prices) {
          return acc;
        }

        acc[tokenAddress] = {
          ...tokenConfigs[tokenAddress],
          prices: prices,
          balance: balancesData?.[tokenAddress],
        };
        return acc;
      }, {} as TokensData),
      isLoading: isBalancesLoading || isPricesLoading,
    };
  }, [tokenKeys, isBalancesLoading, isPricesLoading, tokenConfigs, pricesData, balancesData]);
}
