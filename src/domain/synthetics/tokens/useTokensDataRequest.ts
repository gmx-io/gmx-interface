import { useMemo } from "react";

import { UiContractsChain } from "sdk/configs/chains";
import { getTokensMap, getV2Tokens } from "sdk/configs/tokens";

import { TokensData } from "./types";
import { useOnchainTokenConfigs } from "./useOnchainTokenConfigs";
import { useTokenBalances } from "./useTokenBalances";
import { useTokenRecentPricesRequest } from "./useTokenRecentPricesData";

export type TokensDataResult = {
  tokensData?: TokensData;
  pricesUpdatedAt?: number;
  isBalancesLoaded?: boolean;
  error?: Error;
};

export function useTokensDataRequest(chainId: UiContractsChain): TokensDataResult {
  const tokenConfigs = getTokensMap(chainId);
  const { balancesData, error: balancesError } = useTokenBalances(chainId);
  const { pricesData, updatedAt: pricesUpdatedAt, error: pricesError } = useTokenRecentPricesRequest(chainId);
  const { data: onchainConfigsData, error: onchainConfigsError } = useOnchainTokenConfigs(chainId);

  const error = balancesError || pricesError || onchainConfigsError;

  return useMemo(() => {
    if (error) {
      return {
        error,
      };
    }

    const tokenAddresses = getV2Tokens(chainId).map((token) => token.address);

    if (!pricesData) {
      return {
        tokensData: undefined,
        pricesUpdatedAt: undefined,
      };
    }

    const isBalancesLoaded = Boolean(balancesData);

    return {
      tokensData: tokenAddresses.reduce((acc: TokensData, tokenAddress) => {
        const prices = pricesData[tokenAddress];
        const balance = balancesData?.[tokenAddress];
        const tokenConfig = tokenConfigs[tokenAddress];
        const onchainConfig = onchainConfigsData?.[tokenAddress];

        if (!prices) {
          return acc;
        }

        acc[tokenAddress] = {
          ...tokenConfig,
          ...onchainConfig,
          prices,
          balance,
        };

        return acc;
      }, {} as TokensData),
      pricesUpdatedAt,
      isBalancesLoaded,
    };
  }, [error, chainId, pricesData, pricesUpdatedAt, balancesData, tokenConfigs, onchainConfigsData]);
}
