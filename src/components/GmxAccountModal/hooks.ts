import { useMemo } from "react";
import useSWR from "swr";
import useSWRSubscription, { SWRSubscription } from "swr/subscription";
import { useAccount } from "wagmi";

import { ContractsChainId, getChainName, SettlementChainId, SourceChainId } from "config/chains";
import {
  getMappedTokenId,
  MULTI_CHAIN_PLATFORM_TOKENS_MAP,
  MULTI_CHAIN_TOKEN_MAPPING,
  MultichainTokenMapping,
} from "config/multichain";
import { selectAccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  fetchMultichainTokenBalances,
  fetchSourceChainTokenBalances,
} from "domain/multichain/fetchMultichainTokenBalances";
import type { TokenChainData } from "domain/multichain/types";
import { convertToUsd, getMidPrice, useTokenRecentPricesRequest, useTokensDataRequest } from "domain/synthetics/tokens";
import { TokenPricesData, TokensData } from "domain/tokens";
import { useChainId } from "lib/chains";
import { EMPTY_OBJECT } from "lib/objects";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { getToken } from "sdk/configs/tokens";

export function useAvailableToTradeAssetSymbolsSettlementChain(): string[] {
  const { chainId, srcChainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId, srcChainId);

  return useMemo(() => {
    const tokenSymbols: Record<string, bigint> = {};

    for (const token of Object.values(tokensData ?? {})) {
      const amount = (token.walletBalance ?? 0n) + (token.gmxAccountBalance ?? 0n);
      const usd = convertToUsd(amount, token.decimals, getMidPrice(token.prices))!;

      tokenSymbols[token.symbol] = usd;
    }

    return Object.entries(tokenSymbols)
      .sort((a, b) => (a[1] === b[1] ? 0 : a[1] > b[1] ? -1 : 1))
      .map(([symbol]) => symbol);
  }, [tokensData]);
}

export function useAvailableToTradeAssetSymbolsMultichain(): string[] {
  const { chainId, srcChainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId, srcChainId);

  return useMemo(() => {
    const tokenSymbols: Record<string, bigint> = {};

    for (const token of Object.values(tokensData ?? {})) {
      if (token.gmxAccountBalance !== undefined && token.gmxAccountBalance > 0n) {
        const usd = convertToUsd(token.gmxAccountBalance, token.decimals, getMidPrice(token.prices))!;
        tokenSymbols[token.symbol] = usd;
      }
    }

    return Object.entries(tokenSymbols)
      .sort((a, b) => (a[1] === b[1] ? 0 : a[1] > b[1] ? -1 : 1))
      .map(([symbol]) => symbol);
  }, [tokensData]);
}

export function useAvailableToTradeAssetSettlementChain(): {
  totalUsd: bigint | undefined;
  gmxAccountUsd: bigint | undefined;
  walletUsd: bigint | undefined;

  isGmxAccountLoading: boolean;
  isWalletLoading: boolean;
} {
  const { chainId, srcChainId } = useChainId();
  const { tokensData, isGmxAccountBalancesLoaded, isWalletBalancesLoaded } = useTokensDataRequest(chainId, srcChainId);

  let gmxAccountUsd = 0n;
  let isGmxAccountUsdEmpty = true;

  for (const token of Object.values(tokensData || {})) {
    if (token.gmxAccountBalance === undefined) {
      continue;
    }
    isGmxAccountUsdEmpty = false;
    gmxAccountUsd += convertToUsd(token.gmxAccountBalance, token.decimals, getMidPrice(token.prices))!;
  }

  let walletUsd = 0n;
  let isWalletUsdEmpty = true;

  for (const tokenData of Object.values(tokensData || {})) {
    if (tokenData.walletBalance === undefined) {
      continue;
    }

    isWalletUsdEmpty = false;
    walletUsd += convertToUsd(tokenData.walletBalance, tokenData.decimals, getMidPrice(tokenData.prices))!;
  }

  const totalUsd = gmxAccountUsd + walletUsd;

  return {
    totalUsd: isGmxAccountUsdEmpty || isWalletUsdEmpty ? undefined : totalUsd,
    gmxAccountUsd: isGmxAccountUsdEmpty ? undefined : gmxAccountUsd,
    walletUsd: isWalletUsdEmpty ? undefined : walletUsd,

    isGmxAccountLoading: !isGmxAccountBalancesLoaded,
    isWalletLoading: !isWalletBalancesLoaded,
  };
}

function getTotalGmxAccountUsdFromTokensData(tokensData: TokensData) {
  let totalUsd = 0n;
  for (const token of Object.values(tokensData)) {
    if (token.gmxAccountBalance === undefined || token.gmxAccountBalance === 0n) {
      continue;
    }

    totalUsd += convertToUsd(token.gmxAccountBalance, token.decimals, getMidPrice(token.prices))!;
  }
  return totalUsd;
}

export function useAvailableToTradeAssetMultichainRequest(
  chainId: ContractsChainId,
  srcChainId: SourceChainId | undefined
): {
  gmxAccountUsd: bigint | undefined;
} {
  const { tokensData, isGmxAccountBalancesLoaded } = useTokensDataRequest(chainId, srcChainId);

  if (!tokensData || !isGmxAccountBalancesLoaded) {
    return { gmxAccountUsd: undefined };
  }

  const gmxAccountUsd = getTotalGmxAccountUsdFromTokensData(tokensData);

  return { gmxAccountUsd };
}

export function useAvailableToTradeAssetMultichain(): {
  gmxAccountUsd: bigint | undefined;
} {
  const { chainId, srcChainId } = useChainId();
  return useAvailableToTradeAssetMultichainRequest(chainId, srcChainId);
}

const subscribeMultichainTokenBalances: SWRSubscription<
  [
    name: string,
    chainId: ContractsChainId,
    account: string,
    tokens: string[] | undefined,
    specificChainId: SourceChainId | undefined,
  ],
  {
    tokenBalances: Record<number, Record<string, bigint>>;
    isLoading: boolean;
  }
> = (key, options) => {
  const [, settlementChainId, account, tokens, specificChainId] = key as [
    string,
    SettlementChainId,
    string,
    string[] | undefined,
    SourceChainId | undefined,
  ];

  let tokenBalances: Record<number, Record<string, bigint>> | undefined;
  let isLoaded = false;
  let timeoutId: number | undefined;

  const fetchAndScheduleNext = () => {
    fetchMultichainTokenBalances({
      settlementChainId,
      account,
      progressCallback: (chainId, tokensChainData) => {
        tokenBalances = { ...tokenBalances, [chainId]: tokensChainData };
        options.next(null, { tokenBalances, isLoading: isLoaded ? false : true });
      },
      tokens,
      specificChainId,
    })
      .then((finalTokenBalances) => {
        if (!isLoaded) {
          isLoaded = true;
          options.next(null, { tokenBalances: finalTokenBalances, isLoading: false });
        }
      })
      .finally(() => {
        timeoutId = window.setTimeout(fetchAndScheduleNext, FREQUENT_UPDATE_INTERVAL);
      });
  };

  fetchAndScheduleNext();

  return () => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  };
};

export function useMultichainTradeTokensRequest(
  chainId: ContractsChainId,
  account: string | undefined
): {
  tokenChainDataArray: TokenChainData[];
  isPriceDataLoading: boolean;
  isBalanceDataLoading: boolean;
} {
  const { pricesData, isPriceDataLoading } = useTokenRecentPricesRequest(chainId);

  const { data: balanceData } = useSWRSubscription(
    account ? ["multichain-trade-tokens-balances", chainId, account, undefined, undefined] : null,
    // TODO MLTCH optimistically update useSourceChainTokensDataRequest
    subscribeMultichainTokenBalances
  );

  const tokenBalances = balanceData?.tokenBalances;
  const isBalanceDataLoading = balanceData?.isLoading === undefined ? true : balanceData.isLoading;

  const tokenChainDataArray: TokenChainData[] = useMemo(() => {
    const tokenChainDataArray: TokenChainData[] = [];

    if (!tokenBalances) {
      return tokenChainDataArray;
    }

    for (const sourceChainIdString in tokenBalances) {
      const sourceChainId = parseInt(sourceChainIdString) as SourceChainId;
      const tokensChainBalanceData = tokenBalances[sourceChainId];

      const sourceChainTokenIdMap = MULTI_CHAIN_TOKEN_MAPPING[chainId]?.[sourceChainId];

      if (!sourceChainTokenIdMap) {
        continue;
      }

      const tokenChainData = getTokensChainData({
        chainId,
        sourceChainTokenIdMap,
        pricesData,
        sourceChainId,
        tokensChainBalanceData,
      });

      tokenChainDataArray.push(...Object.values(tokenChainData));
    }

    return tokenChainDataArray;
  }, [tokenBalances, chainId, pricesData]);

  return {
    tokenChainDataArray: tokenChainDataArray,
    isPriceDataLoading,
    isBalanceDataLoading,
  };
}

export function useMultichainTokens() {
  const { chainId } = useChainId();
  const account = useSelector(selectAccount);

  return useMultichainTradeTokensRequest(chainId, account);
}

export function useMultichainMarketTokensBalancesRequest({
  chainId,
  account,
  enabled,
}: {
  chainId: ContractsChainId;
  account: string | undefined;
  enabled: boolean;
}): {
  tokenBalances: Partial<Record<number, Partial<Record<string, bigint>>>>;
  isLoading: boolean;
} {
  const platformTokens = MULTI_CHAIN_PLATFORM_TOKENS_MAP[chainId as SettlementChainId] as string[] | undefined;

  const { data: balancesResult } = useSWRSubscription(
    account && platformTokens?.length && enabled
      ? ["multichain-market-tokens-balances", chainId, account, platformTokens, undefined]
      : null,
    // TODO MLTCH optimistically update useSourceChainTokensDataRequest
    subscribeMultichainTokenBalances
  );

  const balances: Record<number, Record<string, bigint>> = useMemo(() => {
    if (!balancesResult) {
      return EMPTY_OBJECT;
    }

    const balances: Record<number, Record<string, bigint>> = {};

    for (const sourceChainIdRaw in balancesResult.tokenBalances) {
      const sourceChainId = parseInt(sourceChainIdRaw) as SourceChainId;
      for (const sourceChainTokenAddress in balancesResult.tokenBalances[sourceChainId]) {
        const settlementChainTokenId = getMappedTokenId(
          sourceChainId,
          sourceChainTokenAddress,
          chainId as SettlementChainId
        );

        if (!settlementChainTokenId) {
          continue;
        }

        const balance = balancesResult.tokenBalances[sourceChainId][sourceChainTokenAddress];

        if (balance !== undefined && balance !== 0n) {
          if (!balances[sourceChainId]) {
            balances[sourceChainId] = {};
          }
          balances[sourceChainId][settlementChainTokenId.address] = balance;
        }
      }
    }

    return balances;
  }, [balancesResult, chainId]);

  return {
    tokenBalances: balances,
    isLoading: balancesResult?.isLoading ?? true,
  };
}

function getTokensChainData({
  chainId,
  sourceChainTokenIdMap,
  pricesData,
  sourceChainId,
  tokensChainBalanceData,
}: {
  chainId: ContractsChainId;
  sourceChainTokenIdMap: MultichainTokenMapping[SettlementChainId][SourceChainId];
  pricesData: TokenPricesData | undefined;
  sourceChainId: SourceChainId;
  tokensChainBalanceData: Record<string, bigint>;
}): Record<string, TokenChainData> {
  const tokensChainData: Record<string, TokenChainData> = {};

  for (const sourceChainTokenAddress in tokensChainBalanceData) {
    const mapping = sourceChainTokenIdMap[sourceChainTokenAddress];

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
      sourceChainPrices: pricesData?.[settlementChainTokenAddress],
      sourceChainBalance: balance,
    };

    tokensChainData[settlementChainTokenAddress] = tokenChainData;
  }

  return tokensChainData;
}

const getSourceChainTokensDataRequestKey = (
  chainId: ContractsChainId,
  srcChainId: SourceChainId | undefined,
  account: string | undefined
) => {
  return srcChainId && account ? ["source-chain-tokens", chainId, srcChainId, account] : null;
};

export function useSourceChainTokensDataRequest(
  chainId: ContractsChainId,
  srcChainId: SourceChainId | undefined,
  account: string | undefined
): {
  tokensSrcChainData: Record<string, TokenChainData>;
  isPriceDataLoading: boolean;
  isBalanceDataLoading: boolean;
} {
  const { pricesData, isPriceDataLoading } = useTokenRecentPricesRequest(chainId);

  const { data: balanceData, isLoading: isBalanceDataLoading } = useSWR(
    srcChainId && account ? getSourceChainTokensDataRequestKey(chainId, srcChainId, account) : null,
    () => {
      if (!srcChainId || !account) {
        return undefined;
      }
      const sourceChainTokenIdMap = MULTI_CHAIN_TOKEN_MAPPING[chainId]?.[srcChainId];
      if (!sourceChainTokenIdMap) {
        return undefined;
      }

      return fetchSourceChainTokenBalances({
        sourceChainId: srcChainId,
        account: account,
        sourceChainTokenIdMap,
      });
    }
  );

  const tokensSrcChainData: Record<string, TokenChainData> = useMemo(() => {
    if (!balanceData || !srcChainId) {
      return EMPTY_OBJECT;
    }

    const sourceChainTokenIdMap = MULTI_CHAIN_TOKEN_MAPPING[chainId]?.[srcChainId];

    if (!sourceChainTokenIdMap) {
      return EMPTY_OBJECT;
    }

    return getTokensChainData({
      chainId,
      sourceChainTokenIdMap,
      pricesData,
      sourceChainId: srcChainId,
      tokensChainBalanceData: balanceData,
    });
  }, [balanceData, chainId, pricesData, srcChainId]);

  return {
    tokensSrcChainData,
    isPriceDataLoading,
    isBalanceDataLoading,
  };
}

export function useSrcChainTokensData() {
  const { chainId, srcChainId } = useChainId();
  const { address: account } = useAccount();

  return useSourceChainTokensDataRequest(chainId, srcChainId, account);
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
