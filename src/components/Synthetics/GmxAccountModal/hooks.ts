import { useMemo } from "react";
import useSWRSubscription, { SWRSubscription } from "swr/subscription";
import { Address } from "viem";
import { useAccount } from "wagmi";

import { ContractsChainId, SettlementChainId, SourceChainId, getChainName } from "config/chains";
import { MULTI_CHAIN_TOKEN_MAPPING, isSettlementChain } from "config/multichain";
import { fetchMultichainTokenBalances } from "domain/multichain/fetchMultichainTokenBalances";
import type { TokenChainData } from "domain/multichain/types";
import {
  convertToUsd,
  getMidPrice,
  useTokenBalances,
  useTokenRecentPricesRequest,
  useTokensDataRequest,
} from "domain/synthetics/tokens";
import { TokensData } from "domain/tokens";
import { useChainId } from "lib/chains";
import { EMPTY_OBJECT } from "lib/objects";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { getToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

export function useAvailableToTradeAssetSymbolsSettlementChain(): string[] {
  const gmxAccountTokensData = useGmxAccountTokensDataObject();
  const { chainId } = useChainId();
  const { address: account } = useAccount();

  const currentChainTokenBalances = useTokenBalances(chainId, {
    overrideAccount: account,
    enabled: isSettlementChain(chainId),
  });

  const tokenSymbols = new Set<string>();

  for (const token of Object.values(gmxAccountTokensData)) {
    if (token.balance !== undefined && token.balance > 0n) {
      tokenSymbols.add(token.symbol);
    }
  }

  if (chainId) {
    for (const [tokenAddress, balance] of Object.entries(currentChainTokenBalances.balancesData || {})) {
      if (balance !== undefined && balance > 0n) {
        const token = getToken(chainId, tokenAddress);
        tokenSymbols.add(token.symbol);
      }
    }
  }

  return Array.from(tokenSymbols);
}

export function useAvailableToTradeAssetSymbolsMultichain(): string[] {
  const gmxAccountTokensData = useGmxAccountTokensDataObject();

  const tokenSymbols = new Set<string>();

  for (const token of Object.values(gmxAccountTokensData)) {
    if (token.balance !== undefined && token.balance > 0n) {
      tokenSymbols.add(token.symbol);
    }
  }

  return Array.from(tokenSymbols);
}

export function useAvailableToTradeAssetSettlementChain(): {
  totalUsd: bigint | undefined;
  gmxAccountUsd: bigint | undefined;
  walletUsd: bigint | undefined;

  isGmxAccountLoading: boolean;
  isWalletLoading: boolean;
} {
  const { chainId } = useChainId();
  const { tokensData: gmxAccountTokensData, isBalancesLoaded: isGmxAccountBalancesLoaded } = useTokensDataRequest(
    chainId,
    { isGmxAccount: true }
  );
  const { tokensData, isBalancesLoaded } = useTokensDataRequest(chainId);

  let gmxAccountUsd = 0n;
  let isGmxAccountUsdEmpty = true;

  for (const token of Object.values(gmxAccountTokensData || {})) {
    if (token.balance === undefined) {
      continue;
    }
    isGmxAccountUsdEmpty = false;
    gmxAccountUsd += convertToUsd(token.balance, token.decimals, getMidPrice(token.prices))!;
  }

  let walletUsd = 0n;
  let isWalletUsdEmpty = true;

  for (const tokenData of Object.values(tokensData || {})) {
    if (tokenData.balance === undefined) {
      continue;
    }

    isWalletUsdEmpty = false;
    walletUsd += convertToUsd(tokenData.balance, tokenData.decimals, getMidPrice(tokenData.prices))!;
  }

  const totalUsd = gmxAccountUsd + walletUsd;

  return {
    totalUsd: isGmxAccountUsdEmpty || isWalletUsdEmpty ? undefined : totalUsd,
    gmxAccountUsd: isGmxAccountUsdEmpty ? undefined : gmxAccountUsd,
    walletUsd: isWalletUsdEmpty ? undefined : walletUsd,

    isGmxAccountLoading: !isGmxAccountBalancesLoaded,
    isWalletLoading: !isBalancesLoaded,
  };
}

export function getTotalUsdFromTokensData(tokensData: TokensData) {
  let totalUsd = 0n;
  for (const token of Object.values(tokensData)) {
    if (token.balance === undefined || token.balance === 0n) {
      continue;
    }

    totalUsd += convertToUsd(token.balance, token.decimals, getMidPrice(token.prices))!;
  }
  return totalUsd;
}

export function useAvailableToTradeAssetMultichain(): {
  gmxAccountUsd: bigint | undefined;
} {
  const { chainId } = useChainId();
  const { tokensData, isBalancesLoaded } = useTokensDataRequest(chainId, { isGmxAccount: true });

  if (!tokensData || !isBalancesLoaded) {
    return { gmxAccountUsd: undefined };
  }

  const gmxAccountUsd = getTotalUsdFromTokensData(tokensData);

  return { gmxAccountUsd };
}

const subscribeMultichainTokenBalances: SWRSubscription<
  [string, ContractsChainId, Address],
  {
    tokenBalances: Record<number, Record<string, bigint>>;
    isLoading: boolean;
  }
> = (key, options) => {
  const [, settlementChainId, account] = key as [string, SettlementChainId, string];

  let tokenBalances: Record<number, Record<string, bigint>> | undefined;
  let isLoaded = false;
  const interval = window.setInterval(() => {
    fetchMultichainTokenBalances(settlementChainId, account, (chainId, tokensChainData) => {
      tokenBalances = { ...tokenBalances, [chainId]: tokensChainData };
      options.next(null, { tokenBalances, isLoading: isLoaded ? false : true });
    }).then((finalTokenBalances) => {
      if (!isLoaded) {
        isLoaded = true;
        options.next(null, { tokenBalances: finalTokenBalances, isLoading: false });
      }
    });
  }, FREQUENT_UPDATE_INTERVAL);

  return () => {
    window.clearInterval(interval);
  };
};

export function useMultichainTokensRequest(): {
  tokenChainDataArray: TokenChainData[];
  isPriceDataLoading: boolean;
} {
  const { chainId } = useChainId();
  const { address: account } = useAccount();

  const { pricesData, isPriceDataLoading } = useTokenRecentPricesRequest(chainId);

  const { data: balanceData } = useSWRSubscription(
    account ? ["multichain-tokens", chainId, account] : null,
    subscribeMultichainTokenBalances
  );
  const tokenBalances = balanceData?.tokenBalances;

  const tokenChainDataArray: TokenChainData[] = useMemo(() => {
    const tokenChainDataArray: TokenChainData[] = [];

    if (!tokenBalances) {
      return tokenChainDataArray;
    }

    for (const sourceChainIdString in tokenBalances) {
      const sourceChainId = parseInt(sourceChainIdString) as SourceChainId;
      const tokensChainBalanceData = tokenBalances[sourceChainId];

      for (const sourceChainTokenAddress in tokensChainBalanceData) {
        const mapping = MULTI_CHAIN_TOKEN_MAPPING[chainId]?.[sourceChainId]?.[sourceChainTokenAddress];

        if (!mapping) {
          continue;
        }

        const balance = tokensChainBalanceData[sourceChainTokenAddress];

        if (balance === undefined || balance === 0n) {
          continue;
        }

        const settlementChainTokenAddress = mapping.settlementChainTokenAddress;

        const token = getToken(chainId, settlementChainTokenAddress);

        const tokenChainData: TokenChainData = {
          ...token,
          sourceChainId: sourceChainId,
          sourceChainDecimals: mapping.sourceChainTokenDecimals,
          sourceChainPrices: undefined,
          sourceChainBalance: balance,
        };

        if (pricesData && settlementChainTokenAddress in pricesData) {
          // convert prices from settlement chain decimals to source chain decimals if decimals are different

          const settlementChainTokenDecimals = token.decimals;
          const sourceChainTokenDecimals = mapping.sourceChainTokenDecimals;

          let adjustedPrices = pricesData[settlementChainTokenAddress];

          if (settlementChainTokenDecimals !== sourceChainTokenDecimals) {
            // if current price is 1000 with 1 decimal (100_0) on settlement chain
            // and source chain has 3 decimals
            // then price should be 100_000
            // so, 1000 * 10 ** 3 / 10 ** 1 = 100_000
            adjustedPrices = {
              minPrice: bigMath.mulDiv(
                adjustedPrices.minPrice,
                10n ** BigInt(sourceChainTokenDecimals),
                10n ** BigInt(settlementChainTokenDecimals)
              ),
              maxPrice: bigMath.mulDiv(
                adjustedPrices.maxPrice,
                10n ** BigInt(sourceChainTokenDecimals),
                10n ** BigInt(settlementChainTokenDecimals)
              ),
            };
          }

          tokenChainData.sourceChainPrices = adjustedPrices;
        }

        tokenChainDataArray.push(tokenChainData);
      }
    }

    return tokenChainDataArray;
  }, [tokenBalances, chainId, pricesData]);

  return {
    tokenChainDataArray: tokenChainDataArray,
    isPriceDataLoading,
  };
}

export function useGmxAccountTokensDataObject(): TokensData {
  const { chainId } = useChainId();
  const { tokensData = EMPTY_OBJECT as TokensData } = useTokensDataRequest(chainId, { isGmxAccount: true });

  return tokensData;
}

export function useGmxAccountWithdrawNetworks() {
  const { chainId } = useChainId();

  const sourceChains = Object.keys(MULTI_CHAIN_TOKEN_MAPPING[chainId] || {}).map(Number);

  const networks = useMemo(() => {
    return sourceChains.map((sourceChainId) => {
      return {
        id: sourceChainId,
        name: getChainName(sourceChainId),
      };
    });
  }, [sourceChains]);

  return networks;
}
