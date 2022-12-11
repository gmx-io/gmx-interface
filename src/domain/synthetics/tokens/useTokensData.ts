import { getTokensMap, getWhitelistedTokens, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import { useMemo } from "react";
import { TokenPrices, TokensData } from "./types";
import { useTokenBalances } from "./useTokenBalances";
import { useTokenRecentPrices } from "./useTokenRecentPrices";

export function useWhitelistedTokensData(chainId: number) {
  const tokenAddresses = getWhitelistedTokens(chainId).map((token) => token.address);

  return useTokensData(chainId, { tokenAddresses });
}

export function useTokensData(chainId: number, p: { tokenAddresses: string[] }): TokensData {
  const balancesData = useTokenBalances(chainId, { tokenAddresses: p.tokenAddresses });
  const pricesData = useTokenRecentPrices(chainId);
  const tokenConfigs = getTokensMap(chainId);

  return useMemo(
    () =>
      Object.keys(tokenConfigs).reduce((tokensData, tokenAddress) => {
        const token = tokenConfigs[tokenAddress];

        let prices: TokenPrices | undefined = pricesData[token.address];

        if (!prices) {
          if (token.isStable) {
            prices = {
              minPrice: expandDecimals(1, USD_DECIMALS),
              maxPrice: expandDecimals(1, USD_DECIMALS),
            };
          }
          if (token.isWrapped) {
            prices = pricesData[NATIVE_TOKEN_ADDRESS];
          }
        }

        tokensData[token.address] = {
          ...token,
          prices: prices ? { ...prices } : undefined,
          balance: balancesData[token.address],
        };
        return tokensData;
      }, {}),
    [balancesData, pricesData, tokenConfigs]
  );
}
