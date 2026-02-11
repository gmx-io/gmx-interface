import { useMemo } from "react";
import useSWR from "swr";
import { useAccount } from "wagmi";

import { SettlementChainId } from "config/chains";
import { fetchMultichainTokenBalances } from "domain/multichain/fetchMultichainTokenBalances";
import { useTokenRecentPricesRequest, useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import { buildTokenChainDataArray } from "components/GmxAccountModal/hooks";

export function useWalletPortfolioUsd(): {
  walletPortfolioUsd: bigint | undefined;
  isWalletPortfolioUsdLoading: boolean;
} {
  const { chainId } = useChainId();
  const { address: account } = useAccount();
  const tokensData = useTokensDataRequest(chainId, undefined);
  const { pricesData } = useTokenRecentPricesRequest(chainId);

  const { data: multichainTokenBalances, isLoading: isMultichainBalancesLoading } = useSWR(
    account !== undefined ? ["multichain-trade-tokens-balances-static", chainId, account] : null,
    {
      fetcher: async () =>
        fetchMultichainTokenBalances({
          settlementChainId: chainId as SettlementChainId,
          account: account!,
        }),
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  const walletPortfolioUsd = useMemo(() => {
    let totalUsd = 0n;

    if (tokensData.tokensData) {
      for (const token of Object.values(tokensData.tokensData)) {
        if (token.walletBalance === undefined || token.walletBalance === 0n) {
          continue;
        }
        totalUsd += convertToUsd(token.walletBalance, token.decimals, getMidPrice(token.prices))!;
      }
    }

    if (multichainTokenBalances && pricesData) {
      const tokenChainDataArray = buildTokenChainDataArray({
        tokenBalances: multichainTokenBalances,
        chainId,
        pricesData,
      });

      for (const token of tokenChainDataArray) {
        if (token.sourceChainPrices === undefined || token.sourceChainBalance === undefined) {
          continue;
        }
        totalUsd += convertToUsd(
          token.sourceChainBalance,
          token.sourceChainDecimals,
          getMidPrice(token.sourceChainPrices)
        )!;
      }
    }

    return totalUsd;
  }, [tokensData.tokensData, multichainTokenBalances, pricesData, chainId]);

  return {
    walletPortfolioUsd,
    isWalletPortfolioUsdLoading:
      isMultichainBalancesLoading || !tokensData.isBalancesLoaded || !tokensData.isWalletBalancesLoaded,
  };
}
