import { useMemo } from "react";

import { useGmxAccountTokenBalances } from "domain/multichain/useGmxAccountTokenBalances";
import { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { getTokensMap, getV2Tokens } from "sdk/configs/tokens";
import { TokenBalanceType } from "sdk/types/tokens";

import { TokensData } from "./types";
import { useOnchainTokenConfigs } from "./useOnchainTokenConfigs";
import { useTokenBalances } from "./useTokenBalances";
import { useTokenRecentPricesRequest } from "./useTokenRecentPricesData";

export type TokensDataResult = {
  tokensData: TokensData | undefined;
  pricesUpdatedAt: number | undefined;
  isGmxAccountBalancesLoaded: boolean;
  isWalletBalancesLoaded: boolean;
  /**
   * If srcChainId is undefined, then this is the wallet balances loaded
   * If srcChainId is defined, then this is the gmx account balances loaded
   */
  isBalancesLoaded: boolean;
  error: Error | undefined;
};

export function useTokensDataRequest(
  chainId: ContractsChainId,
  srcChainId?: SourceChainId,
  params?: { enabled?: boolean }
): TokensDataResult {
  const tokenConfigs = getTokensMap(chainId);
  const { balancesData: walletBalancesData, error: walletBalancesError } = useTokenBalances(chainId, {
    enabled: params?.enabled,
  });
  const { balancesData: gmxAccountBalancesData, error: gmxAccountBalancesError } = useGmxAccountTokenBalances(chainId, {
    enabled: params?.enabled,
  });
  const {
    pricesData,
    updatedAt: pricesUpdatedAt,
    error: pricesError,
  } = useTokenRecentPricesRequest(chainId, {
    enabled: params?.enabled,
  });
  const { data: onchainConfigsData, error: onchainConfigsError } = useOnchainTokenConfigs(chainId, {
    enabled: params?.enabled,
  });

  const error = walletBalancesError || pricesError || onchainConfigsError || gmxAccountBalancesError;

  return useMemo((): TokensDataResult => {
    if (!pricesData) {
      return {
        tokensData: undefined,
        pricesUpdatedAt: undefined,
        isGmxAccountBalancesLoaded: false,
        isWalletBalancesLoaded: false,
        isBalancesLoaded: false,
        error,
      };
    }

    const tokenAddresses = getV2Tokens(chainId).map((token) => token.address);

    const isWalletBalancesLoaded = Boolean(walletBalancesData);
    const isGmxAccountBalancesLoaded = Boolean(gmxAccountBalancesData);

    const isBalancesLoaded = srcChainId !== undefined ? isGmxAccountBalancesLoaded : isWalletBalancesLoaded;

    return {
      tokensData: tokenAddresses.reduce((acc: TokensData, tokenAddress) => {
        const prices = pricesData[tokenAddress];
        const walletBalance = walletBalancesData?.[tokenAddress];
        const gmxAccountBalance = gmxAccountBalancesData?.[tokenAddress];
        const tokenConfig = tokenConfigs[tokenAddress];
        const onchainConfig = onchainConfigsData?.[tokenAddress];

        if (!prices) {
          return acc;
        }

        acc[tokenAddress] = {
          ...tokenConfig,
          ...onchainConfig,
          prices,
          walletBalance,
          gmxAccountBalance,
          balance: srcChainId !== undefined ? gmxAccountBalance : walletBalance,
          balanceType: getBalanceTypeFromSrcChainId(srcChainId),
        };

        return acc;
      }, {} as TokensData),
      pricesUpdatedAt,
      isBalancesLoaded,
      isGmxAccountBalancesLoaded,
      isWalletBalancesLoaded,
      error,
    };
  }, [
    walletBalancesData,
    chainId,
    error,
    gmxAccountBalancesData,
    onchainConfigsData,
    pricesData,
    pricesUpdatedAt,
    srcChainId,
    tokenConfigs,
  ]);
}

export function getBalanceTypeFromSrcChainId(srcChainId: SourceChainId | undefined) {
  if (srcChainId !== undefined) {
    return TokenBalanceType.GmxAccount;
  }

  return TokenBalanceType.Wallet;
}
