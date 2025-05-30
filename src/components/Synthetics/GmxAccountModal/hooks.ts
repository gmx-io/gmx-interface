import { useMemo } from "react";
import useSWRSubscription, { SWRSubscription } from "swr/subscription";
import { Address, zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { UiContractsChain, UiSettlementChain, getChainName } from "config/chains";
import { multichainBalanceKey } from "config/dataStore";
import { MARKETS } from "config/markets";
import {
  MULTI_CHAIN_SUPPORTED_TOKEN_MAP,
  MULTI_CHAIN_TOKEN_MAPPING,
  SETTLEMENT_CHAINS,
  isSettlementChain,
} from "context/GmxAccountContext/config";
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
import { useChainId } from "lib/chains";
import { MulticallRequestConfig, MulticallResult, useMulticall } from "lib/multicall";
import { EMPTY_OBJECT } from "lib/objects";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { getContract } from "sdk/configs/contracts";
import { getToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import { fetchMultichainTokenBalances } from "./fetchMultichainTokenBalances";

export function useAvailableToTradeAssetSymbolsSettlementChain(): string[] {
  const gmxAccountTokensData = useGmxAccountTokensDataObject();
  const { chainId } = useChainId();
  const { address: account } = useAccount();

  const currentChainTokenBalances = useTokenBalances(
    chainId,
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
  const { chainId } = useChainId();
  const gmxAccountTokensData = useGmxAccountTokensDataObject();
  const { tokensData } = useTokensDataRequest(chainId);

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
  const gmxAccountTokensData = useGmxAccountTokensDataObject();

  const gmxAccountUsd = getTotalUsdFromTokensData(gmxAccountTokensData);

  if (gmxAccountUsd === 0n) {
    return { gmxAccountUsd: undefined };
  }

  return { gmxAccountUsd };
}

const subscribeMultichainTokenBalances: SWRSubscription<
  [string, UiContractsChain, Address],
  {
    tokenBalances: Record<number, Record<string, bigint>>;
    isLoading: boolean;
  }
> = (key, options) => {
  const [, settlementChainId, account] = key;

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

export function useMultichainTokensRequest(): { tokenChainDataArray: TokenChainData[]; isPriceDataLoading: boolean } {
  const { chainId } = useChainId();
  const { address: account } = useAccount();

  const { pricesData, isPriceDataLoading } = useTokenRecentPricesRequest(chainId);

  const { data } = useSWRSubscription(
    account ? ["multichain-tokens", chainId, account] : null,
    subscribeMultichainTokenBalances
  );
  const tokenBalances = data?.tokenBalances;

  const tokenChainDataArray: TokenChainData[] = useMemo(() => {
    const tokenChainDataArray: TokenChainData[] = [];

    if (!tokenBalances) {
      return tokenChainDataArray;
    }

    for (const sourceChainIdString in tokenBalances) {
      const sourceChainId = parseInt(sourceChainIdString);
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
          sourceChainId,
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

  return { tokenChainDataArray: tokenChainDataArray, isPriceDataLoading };
}

const TRADABLE_ASSETS_MAP: Record<UiSettlementChain, Address[]> = {} as any;

for (const chainId of SETTLEMENT_CHAINS) {
  const tradableTokenAddressesSet = new Set<Address>();

  // TODO: somehow do not show it in the balances list, but keep in tokensData
  tradableTokenAddressesSet.add(zeroAddress);

  for (const marketAddress in MARKETS[chainId]) {
    const marketConfig = MARKETS[chainId][marketAddress];

    tradableTokenAddressesSet.add(marketConfig.longTokenAddress as Address);
    tradableTokenAddressesSet.add(marketConfig.shortTokenAddress as Address);
  }

  TRADABLE_ASSETS_MAP[chainId] = Array.from(tradableTokenAddressesSet);
}

function buildGmxAccountTokenBalancesRequest(settlementChainId: UiSettlementChain, account: string) {
  const tradableTokenAddresses: Address[] = TRADABLE_ASSETS_MAP[settlementChainId];

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
      calls: erc20Calls,
    },
  };

  return request;
}

function parseGmxAccountTokenBalancesData(
  data: MulticallResult<
    MulticallRequestConfig<
      Record<
        string,
        {
          calls: Record<string, { methodName: "getUint"; params: [string] }>;
        }
      >
    >
  >
): Record<string, bigint> {
  return Object.fromEntries(
    Object.entries(data.data.DataStore).map(([tokenAddress, callResult]) => [tokenAddress, callResult.returnValues[0]])
  );
}

export function useGmxAccountTokensDataRequest(chainId: UiContractsChain): TokensDataResult {
  const { address: account } = useAccount();
  const { pricesData, error: pricesError, updatedAt: pricesUpdatedAt } = useTokenRecentPricesRequest(chainId);
  const { data: onchainConfigsData, error: onchainConfigsError } = useOnchainTokenConfigs(chainId);

  const queryCondition = account && isSettlementChain(chainId);

  const { data: tokenBalances, error: tokenBalancesError } = useMulticall(chainId, "gmx-account-tokens", {
    key: queryCondition ? ["gmx-account-tokens", chainId, account] : null,
    request: queryCondition ? buildGmxAccountTokenBalancesRequest(chainId, account!) : {},
    parseResponse: parseGmxAccountTokenBalancesData,
  });

  const error = tokenBalancesError || pricesError || onchainConfigsError;

  const gmxAccountTokensData: TokensData | undefined = useMemo(() => {
    if (!pricesData) {
      return undefined;
    }

    const gmxAccountTokensData: TokensData = {};

    for (const tokenAddress in pricesData) {
      const token = getToken(chainId, tokenAddress);
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
        balance: tokenBalances?.[tokenAddress],
      };
    }

    return gmxAccountTokensData;
  }, [onchainConfigsData, pricesData, chainId, tokenBalances]);

  return {
    tokensData: gmxAccountTokensData,
    error,
    pricesUpdatedAt,
    isBalancesLoaded: Boolean(tokenBalances),
  };
}

export function useGmxAccountTokensDataObject(): TokensData {
  const { chainId } = useChainId();
  const { tokensData = EMPTY_OBJECT as TokensData } = useGmxAccountTokensDataRequest(chainId);

  return tokensData;
}

export function useGmxAccountWithdrawNetworks() {
  const { chainId } = useChainId();

  const sourceChains = Object.keys(MULTI_CHAIN_SUPPORTED_TOKEN_MAP[chainId] || {}).map(Number);

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
