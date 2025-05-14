import { useMemo } from "react";
import useSWR from "swr";
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
import { useChainId } from "lib/chains";
import { MulticallRequestConfig, executeMulticall } from "lib/multicall";
import { EMPTY_OBJECT } from "lib/objects";
import { FREQUENT_MULTICALL_REFRESH_INTERVAL, FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
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

export function useMultichainTokensRequest(): TokenChainData[] {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const { address: account } = useAccount();

  const { pricesData } = useTokenRecentPricesRequest(settlementChainId);

  const { data } = useSWRSubscription(
    account ? ["multichain-tokens", settlementChainId, account] : null,
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
          // settlementChainAddress: settlementChainTokenAddress,
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
  }, [tokenBalances, settlementChainId, pricesData]);

  return tokenChainDataArray;
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

export async function fetchGmxAccountTokenBalancesData(
  settlementChainId: UiSettlementChain,
  account: string
): Promise<Record<string, bigint>> {
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

  const gmxAccountTokensData: TokensData | undefined = useMemo(() => {
    if (!pricesData) {
      return undefined;
    }

    const gmxAccountTokensData: TokensData = {};

    for (const tokenAddress in pricesData) {
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
        balance: tokenBalances?.[tokenAddress],
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
