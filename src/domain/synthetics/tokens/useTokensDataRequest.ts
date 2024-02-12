import { getTokensMap, getV2Tokens } from "config/tokens";
import { useMemo } from "react";
import { TokensData } from "./types";
import { useTokenBalances } from "./useTokenBalances";
import { useTokenRecentPricesRequest } from "./useTokenRecentPricesData";

type TokensDataResult = {
  tokensData?: TokensData;
  pricesUpdatedAt?: number;
};

export function useTokensDataRequest(chainId: number): TokensDataResult {
  const tokenConfigs = getTokensMap(chainId);
  const { balancesData } = useTokenBalances(chainId);
  const { pricesData, updatedAt: pricesUpdatedAt } = useTokenRecentPricesRequest(chainId);

  return useMemo(() => {
    const tokenAddresses = getV2Tokens(chainId).map((token) => token.address);

    if (!pricesData) {
      return {
        tokensData: undefined,
        pricesUpdatedAt: undefined,
      };
    }

    return {
      tokensData: tokenAddresses.reduce((acc: TokensData, tokenAddress) => {
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
      pricesUpdatedAt,
    };
  }, [chainId, pricesData, pricesUpdatedAt, balancesData, tokenConfigs]);
}
