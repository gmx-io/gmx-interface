import { useMemo } from "react";
import useSWR from "swr";
import useSWRSubscription, { SWRSubscription } from "swr/subscription";
import { Address } from "viem";
import { useAccount } from "wagmi";

import { ContractsChainId, SettlementChainId, SourceChainId, getChainName } from "config/chains";
import { MULTI_CHAIN_TOKEN_MAPPING, MultichainTokenMapping } from "config/multichain";
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
import { bigMath } from "sdk/utils/bigmath";

export function useAvailableToTradeAssetSymbolsSettlementChain(): string[] {
  const { chainId, srcChainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId, srcChainId);

  const tokenSymbols = new Set<string>();

  for (const token of Object.values(tokensData ?? {})) {
    if (token.walletBalance !== undefined && token.walletBalance > 0n) {
      tokenSymbols.add(token.symbol);
    }
    if (token.gmxAccountBalance !== undefined && token.gmxAccountBalance > 0n) {
      tokenSymbols.add(token.symbol);
    }
  }

  return Array.from(tokenSymbols);
}

export function useAvailableToTradeAssetSymbolsMultichain(): string[] {
  const { chainId, srcChainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId, srcChainId);

  const tokenSymbols = new Set<string>();

  for (const token of Object.values(tokensData ?? {})) {
    if (token.gmxAccountBalance !== undefined && token.gmxAccountBalance > 0n) {
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

export function useAvailableToTradeAssetMultichain(): {
  gmxAccountUsd: bigint | undefined;
} {
  const { chainId, srcChainId } = useChainId();
  const { tokensData, isGmxAccountBalancesLoaded } = useTokensDataRequest(chainId, srcChainId);

  if (!tokensData || !isGmxAccountBalancesLoaded) {
    return { gmxAccountUsd: undefined };
  }

  const gmxAccountUsd = getTotalGmxAccountUsdFromTokensData(tokensData);

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
    fetchMultichainTokenBalances({
      settlementChainId,
      account,
      progressCallback: (chainId, tokensChainData) => {
        tokenBalances = { ...tokenBalances, [chainId]: tokensChainData };
        options.next(null, { tokenBalances, isLoading: isLoaded ? false : true });
      },
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
  isBalanceDataLoading: boolean;
} {
  const { chainId } = useChainId();
  const { address: account } = useAccount();

  const { pricesData, isPriceDataLoading } = useTokenRecentPricesRequest(chainId);

  const { data: balanceData } = useSWRSubscription(
    account ? ["multichain-tokens", chainId, account] : null,
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

    tokensChainData[settlementChainTokenAddress] = tokenChainData;
  }

  return tokensChainData;
}

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
    srcChainId && account ? ["source-chain-tokens", chainId, srcChainId, account] : null,
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
        account: account!,
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
