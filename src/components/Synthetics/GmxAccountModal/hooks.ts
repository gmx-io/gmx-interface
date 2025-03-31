import { ARBITRUM, AVALANCHE, BASE_MAINNET, SONIC_MAINNET } from "config/chains";
import {
  convertToUsd,
  getMidPrice,
  useTokenBalances,
  useTokenRecentPricesRequest,
  useTokensDataRequest,
} from "domain/synthetics/tokens";
import { TokensData } from "domain/tokens";
import { EMPTY_OBJECT } from "lib/objects";
import { FREQUENT_MULTICALL_REFRESH_INTERVAL } from "lib/timeConstants";
import useWallet from "lib/wallets/useWallet";
import { useEffect, useMemo } from "react";
import { getToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import useSWR from "swr";
import {
  MULTI_CHAIN_TOKEN_MAPPING,
  MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS,
  isSettlementChain,
} from "../../../context/GmxAccountContext/config";
import { DEV_FUNDING_HISTORY } from "../../../context/GmxAccountContext/dev";
import { useGmxAccountSettlementChainId } from "../../../context/GmxAccountContext/hooks";
import { TokenChainData } from "../../../context/GmxAccountContext/types";
import { fetchMultichainTokenBalances } from "./fetchMultichainTokenBalances";

export function useAvailableToTradeAssetSymbolsSettlementChain(): string[] {
  const gmxAccountTokensData = useGmxAccountTokensData();
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

  for (const [tokenAddress, balance] of Object.entries(currentChainTokenBalances.balancesData || {})) {
    if (balance !== undefined && balance > 0n) {
      tokenSymbols.add(tokenAddress);
    }
  }

  return Array.from(tokenSymbols);
}

export function useAvailableToTradeAssetSymbolsMultichain(): string[] {
  const gmxAccountTokensData = useGmxAccountTokensData();

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
  const gmxAccountTokensData = useGmxAccountTokensData();
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
  const gmxAccountTokensData = useGmxAccountTokensData();

  let gmxAccountUsd = 0n;

  for (const token of Object.values(gmxAccountTokensData)) {
    if (token.balance === undefined || token.balance === 0n) {
      continue;
    }

    gmxAccountUsd += convertToUsd(token.balance, token.decimals, getMidPrice(token.prices))!;
  }

  return { gmxAccountUsd };
}

export function useGmxAccountFundingHistory() {
  const fundingHistory = useMemo(() => [...DEV_FUNDING_HISTORY].sort((a, b) => b.timestamp - a.timestamp), []);

  return fundingHistory;
}

export function useMultichainTokens(): TokenChainData[] {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const { account } = useWallet();

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

export function useGmxAccountTokensData(): TokensData {
  const [settlementChainId] = useGmxAccountSettlementChainId();

  const settlementChainWithdrawSupportedTokens = MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS[settlementChainId];

  if (!settlementChainWithdrawSupportedTokens) {
    return EMPTY_OBJECT;
  }

  const gmxAccountTokensData: TokensData = {};

  for (const tokenAddress of settlementChainWithdrawSupportedTokens) {
    const token = getToken(settlementChainId, tokenAddress);
    gmxAccountTokensData[tokenAddress] = {
      ...token,
      prices: {
        minPrice: 10n * 10n ** (30n - BigInt(token.decimals)),
        maxPrice: 10n * 10n ** (30n - BigInt(token.decimals)),
      },
      balance: 10n * 10n ** BigInt(token.decimals),
    };
  }

  return gmxAccountTokensData;
}

export function useGmxAccountWithdrawNetworks() {
  const networks = useMemo(
    () => [
      { id: ARBITRUM, name: "Arbitrum", fee: "0.32 USDC" },
      { id: AVALANCHE, name: "Avalanche", fee: "0.15 USDC" },
      { id: SONIC_MAINNET, name: "Sonic", fee: "0.59 USDC" },
      { id: BASE_MAINNET, name: "Base", fee: "Free" },
    ],
    []
  );

  return networks;
}
