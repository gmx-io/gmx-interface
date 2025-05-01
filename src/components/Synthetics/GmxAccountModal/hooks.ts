import { useMemo } from "react";
import useSWR from "swr";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { getChainName } from "config/chains";
import { multichainBalanceKey } from "config/dataStore";
import { MARKETS } from "config/markets";
import {
  MULTI_CHAIN_SUPPORTED_TOKEN_MAP,
  MULTI_CHAIN_TOKEN_MAPPING,
  isSettlementChain,
} from "context/GmxAccountContext/config";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { TokenChainData } from "context/GmxAccountContext/types";
import {
  TokensDataResult,
  convertToUsd,
  getMidPrice,
  useTokenBalances,
  useTokenRecentPricesRequest,
  useTokensDataRequest,
} from "domain/synthetics/tokens";
import { useOnchainTokenConfigs } from "domain/synthetics/tokens/useOnchainTokenConfigs";
import { TokensData } from "domain/tokens";
import { MulticallRequestConfig, executeMulticall } from "lib/multicall";
import { EMPTY_OBJECT } from "lib/objects";
import { FREQUENT_MULTICALL_REFRESH_INTERVAL } from "lib/timeConstants";
import useWallet from "lib/wallets/useWallet";
import { getContract } from "sdk/configs/contracts";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import { fetchMultichainTokenBalances } from "./fetchMultichainTokenBalances";

export function useAvailableToTradeAssetSymbolsSettlementChain(): string[] {
  const gmxAccountTokensData = useGmxAccountTokensDataObject();
  const { chainId, account } = useWallet();

  const currentChainTokenBalances = useTokenBalances(
    chainId!,
    account,
    undefined,
    undefined,
    isSettlementChain(chainId!)
  );

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
  totalUsd: bigint;
  gmxAccountUsd: bigint;
  walletUsd: bigint;
} {
  const { chainId } = useWallet();
  const gmxAccountTokensData = useGmxAccountTokensDataObject();
  const { tokensData } = useTokensDataRequest(chainId!);

  let gmxAccountUsd = 0n;

  for (const token of Object.values(gmxAccountTokensData)) {
    if (token.balance === undefined || token.balance === 0n) {
      continue;
    }

    gmxAccountUsd += convertToUsd(token.balance, token.decimals, getMidPrice(token.prices))!;
  }

  let walletUsd = 0n;

  for (const tokenData of Object.values(tokensData || {})) {
    if (tokenData.balance === undefined || tokenData.balance === 0n) {
      continue;
    }

    walletUsd += convertToUsd(tokenData.balance, tokenData.decimals, getMidPrice(tokenData.prices))!;
  }

  const totalUsd = gmxAccountUsd + walletUsd;

  return { totalUsd, gmxAccountUsd, walletUsd };
}

export function useAvailableToTradeAssetMultichain(): {
  gmxAccountUsd: bigint;
} {
  const gmxAccountTokensData = useGmxAccountTokensDataObject();

  let gmxAccountUsd = 0n;

  for (const token of Object.values(gmxAccountTokensData)) {
    if (token.balance === undefined || token.balance === 0n) {
      continue;
    }

    gmxAccountUsd += convertToUsd(token.balance, token.decimals, getMidPrice(token.prices))!;
  }

  return { gmxAccountUsd };
}

export function useMultichainTokens(): TokenChainData[] {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const { address: account } = useAccount();

  const { pricesData } = useTokenRecentPricesRequest(settlementChainId);

  const { data: tokenBalances } = useSWR<Record<number, Record<string, bigint>>>(
    account ? ["multichain-tokens", settlementChainId, account] : null,
    async () => {
      if (!account) {
        return EMPTY_OBJECT;
      }
      return await fetchMultichainTokenBalances(settlementChainId, account);
    },
    {
      refreshInterval: FREQUENT_MULTICALL_REFRESH_INTERVAL,
    }
  );

  const tokenChainDataArray: TokenChainData[] = useMemo(() => {
    const tokenChainDataArray: TokenChainData[] = [];

    for (const sourceChainIdString in tokenBalances) {
      const sourceChainId = parseInt(sourceChainIdString);
      const tokensChainBalanceData = tokenBalances[sourceChainId];

      for (const sourceChainTokenAddress in tokensChainBalanceData) {
        const mapping = MULTI_CHAIN_TOKEN_MAPPING[settlementChainId]?.[sourceChainId]?.[sourceChainTokenAddress];

        if (!mapping) {
          continue;
        }

        const balance = tokensChainBalanceData[sourceChainTokenAddress];

        if (balance === undefined || balance === 0n) {
          continue;
        }

        const settlementChainTokenAddress = mapping.settlementChainTokenAddress;

        const token = getToken(settlementChainId, settlementChainTokenAddress);

        const tokenChainData: TokenChainData = {
          ...token,
          sourceChainId,
          sourceChainDecimals: mapping.sourceChainTokenDecimals,
          sourceChainPrices: undefined,
          sourceChainBalance: balance,
          settlementChainAddress: settlementChainTokenAddress,
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
  }, [pricesData, settlementChainId, tokenBalances]);

  return tokenChainDataArray;
}

export async function fetchGmxAccountTokenBalancesData(
  settlementChainId: number,
  account: string
): Promise<Record<string, bigint>> {
  const tradableTokenAddressesSet = new Set<string>();

  tradableTokenAddressesSet.add(zeroAddress);

  for (const marketAddress in MARKETS[settlementChainId]) {
    const marketConfig = MARKETS[settlementChainId][marketAddress];

    tradableTokenAddressesSet.add(marketConfig.longTokenAddress);
    tradableTokenAddressesSet.add(marketConfig.shortTokenAddress);

    tradableTokenAddressesSet.add(convertTokenAddress(settlementChainId, marketConfig.longTokenAddress, "native"));
    tradableTokenAddressesSet.add(convertTokenAddress(settlementChainId, marketConfig.shortTokenAddress, "native"));
  }

  const tradableTokenAddresses = Array.from(tradableTokenAddressesSet);

  const erc20Calls = Object.fromEntries(
    tradableTokenAddresses.map((tokenAddress) => [
      tokenAddress,
      {
        methodName: "getUint",
        params: [multichainBalanceKey(account, tokenAddress)],
      },
    ])
  );

  const request: MulticallRequestConfig<
    Record<
      string,
      {
        calls: Record<string, { methodName: "getUint"; params: [string] }>;
      }
    >
  > = {
    DataStore: {
      abiId: "DataStoreArbitrumSepolia",
      contractAddress: getContract(settlementChainId, "DataStore"),
      calls: {
        ...erc20Calls,
      },
    },
  };

  console.log("request", request);

  // TODO: pass priority to from args
  const result = await executeMulticall(settlementChainId, request, "urgent", "fetchGmxAccountTokensData");

  return Object.fromEntries(
    Object.entries(result.data.DataStore).map(([tokenAddress, callResult]) => [
      tokenAddress,
      callResult.returnValues[0],
    ])
  );
}

export function useGmxAccountTokensDataRequest(): TokensDataResult {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const { address: account } = useAccount();
  const { pricesData, error: pricesError, updatedAt: pricesUpdatedAt } = useTokenRecentPricesRequest(settlementChainId);
  const { data: onchainConfigsData, error: onchainConfigsError } = useOnchainTokenConfigs(settlementChainId);

  const { data: tokenBalances, error: tokenBalancesError } = useSWR<Record<string, bigint>>(
    account ? ["gmx-account-tokens", settlementChainId, account] : null,
    async () => {
      return await fetchGmxAccountTokenBalancesData(settlementChainId, account!);
    },
    {
      refreshInterval: FREQUENT_MULTICALL_REFRESH_INTERVAL,
    }
  );

  const error = tokenBalancesError || pricesError || onchainConfigsError;

  const gmxAccountTokensData: TokensData = useMemo(() => {
    const gmxAccountTokensData: TokensData = {};

    for (const tokenAddress in tokenBalances) {
      const token = getToken(settlementChainId, tokenAddress);
      const onchainConfig = onchainConfigsData?.[tokenAddress];

      // TODO: decide whether to block the token if prices are not available
      if (!pricesData || !(tokenAddress in pricesData)) {
        continue;
      }

      // if (tokenBalances[tokenAddress] <= 0n) {
      //   continue;
      // }

      gmxAccountTokensData[tokenAddress] = {
        ...token,
        ...onchainConfig,
        prices: pricesData[tokenAddress],
        balance: tokenBalances[tokenAddress],
      };
    }

    return gmxAccountTokensData;
  }, [onchainConfigsData, pricesData, settlementChainId, tokenBalances]);

  return {
    tokensData: gmxAccountTokensData,
    error,
    pricesUpdatedAt,
    isBalancesLoaded: Boolean(tokenBalances),
  };
}

export function useGmxAccountTokensDataObject(): TokensData {
  const { tokensData = EMPTY_OBJECT as TokensData } = useGmxAccountTokensDataRequest();

  return tokensData;
}

export function useGmxAccountWithdrawNetworks() {
  const [settlementChainId] = useGmxAccountSettlementChainId();

  const sourceChains = Object.keys(MULTI_CHAIN_SUPPORTED_TOKEN_MAP[settlementChainId] || {}).map(Number);

  const networks = useMemo(() => {
    return sourceChains.map((sourceChainId) => {
      return {
        id: sourceChainId,
        name: getChainName(sourceChainId),
        fee: "0.13 USDC",
      };
    });
  }, [sourceChains]);

  return networks;
}
