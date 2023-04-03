import { getAvailableTradeTokens, getTokensMap } from "config/tokens";
import { useMemo } from "react";
import { TokensData } from "./types";
import { useTokenBalances } from "./useTokenBalances";
import { useTokenRecentPrices } from "./useTokenRecentPricesData";

type TokensDataResult = {
  tokensData?: TokensData;
};

export function useAvailableTokensData(chainId: number): TokensDataResult {
  const tokenAddresses = useMemo(
    () => getAvailableTradeTokens(chainId, { includeSynthetic: true }).map((token) => token.address),
    [chainId]
  );

  return useTokensData(chainId, { tokenAddresses });
}

export function useTokensData(chainId: number, { tokenAddresses }: { tokenAddresses: string[] }): TokensDataResult {
  const tokenConfigs = getTokensMap(chainId);
  const { balancesData } = useTokenBalances(chainId, { tokenAddresses });
  const { pricesData } = useTokenRecentPrices(chainId);

  const tokenKeys = tokenAddresses.join("-");

  return useMemo(() => {
    if (!pricesData) {
      return {
        tokensData: undefined,
      };
    }

    return {
      tokensData: tokenKeys.split("-").reduce((acc: TokensData, tokenAddress) => {
        const prices = pricesData[tokenAddress];
        const balance = balancesData?.[tokenAddress];
        const tokenConfig = tokenConfigs[tokenAddress];

        if (!prices) {
          return acc;
        }

        acc[tokenAddress] = {
          ...tokenConfig,
          prices,
          balance,
        };
        return acc;
      }, {} as TokensData),
    };
  }, [tokenKeys, tokenConfigs, pricesData, balancesData]);
}
