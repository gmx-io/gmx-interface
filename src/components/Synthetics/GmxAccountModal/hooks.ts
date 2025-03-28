import { ARBITRUM, AVALANCHE, BASE_MAINNET, SONIC_MAINNET } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import {
  convertToTokenAmount,
  convertToUsd,
  getMidPrice,
  useTokenBalances,
  useTokensDataRequest,
} from "domain/synthetics/tokens";
import { TokenData, TokenPrices, TokensData } from "domain/tokens";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { useMemo } from "react";
import { getToken } from "sdk/configs/tokens";
import {
  MULTI_CHAIN_DEPOSIT_SUPPORTED_TOKENS,
  MULTI_CHAIN_TOKEN_MAPPING,
  MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS,
  isSettlementChain,
} from "../../../context/GmxAccountContext/config";
import { DEV_FUNDING_HISTORY } from "../../../context/GmxAccountContext/dev";
import { useGmxAccountSettlementChainId } from "../../../context/GmxAccountContext/hooks";
import { TokenChainData } from "../../../context/GmxAccountContext/types";

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
  const multichainTokenIds = MULTI_CHAIN_DEPOSIT_SUPPORTED_TOKENS[settlementChainId];

  if (!multichainTokenIds) {
    return EMPTY_ARRAY;
  }

  return multichainTokenIds
    .map((tokenId): TokenChainData | undefined => {
      const mapping = MULTI_CHAIN_TOKEN_MAPPING[settlementChainId]?.[tokenId.chainId]?.[tokenId.address];

      if (!mapping) {
        return undefined;
      }

      const token = getToken(settlementChainId, mapping.settlementChainTokenAddress);

      const prices: TokenPrices = {
        maxPrice: (10n * 10n ** BigInt(USD_DECIMALS)) / 10n ** BigInt(mapping.sourceChainTokenDecimals),
        minPrice: (10n * 10n ** BigInt(USD_DECIMALS)) / 10n ** BigInt(mapping.sourceChainTokenDecimals),
      };

      return {
        ...token,
        sourceChainId: tokenId.chainId,
        sourceChainDecimals: mapping.sourceChainTokenDecimals,
        sourceChainPrices: prices,
        sourceChainBalance: convertToTokenAmount(
          10n * 10n ** BigInt(USD_DECIMALS),
          mapping.sourceChainTokenDecimals,
          getMidPrice(prices)
        ),
      } satisfies TokenChainData;
    })
    .filter((token): token is TokenChainData => token !== undefined);
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
