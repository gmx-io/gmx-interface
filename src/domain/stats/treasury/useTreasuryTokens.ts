import { useMemo } from "react";

import { getContract } from "config/contracts";
import type { TokenPricesData } from "domain/synthetics/tokens";
import { useMulticall } from "lib/multicall";
import type { ContractsChainId } from "sdk/configs/chains";
import { getToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { Token } from "sdk/utils/tokens/types";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import { TREASURY_EMPTY_RESULT } from "./constants";
import { createBalanceCalls, sumBalancesFromCalls } from "./shared";
import type { TreasuryBalanceAsset, TreasuryData } from "./types";

export function useTreasuryTokens({
  chainId,
  addresses,
  tokenMap,
  pricesData,
}: {
  chainId: ContractsChainId;
  addresses: string[];
  tokenMap: Record<string, Token>;
  pricesData?: TokenPricesData;
}): TreasuryData | undefined {
  const tokenAddresses = useMemo(() => {
    const uniqueAddresses = new Set<string>();

    Object.values(tokenMap).forEach((token) => {
      if (token.isSynthetic) {
        return;
      }

      if (token.address.startsWith("0x")) {
        uniqueAddresses.add(token.address);
      }
    });

    return Array.from(uniqueAddresses);
  }, [tokenMap]);

  const requestConfig = useMemo(() => {
    if (!addresses.length || !tokenAddresses.length) {
      return undefined;
    }

    return buildTreasuryTokensRequest({ chainId, addresses, tokenAddresses });
  }, [addresses, chainId, tokenAddresses]);

  const { data: tokenBalancesResponse } = useMulticall(chainId, "useTreasuryTokens", {
    key: requestConfig ? [chainId, "tokens", addresses.length, tokenAddresses.length] : null,
    request: requestConfig ?? {},
    parseResponse: (res) => res.data,
  });

  return useMemo(() => {
    if (requestConfig && tokenBalancesResponse === undefined) {
      return undefined;
    }

    if (!tokenBalancesResponse) {
      return TREASURY_EMPTY_RESULT;
    }

    const assets: TreasuryBalanceAsset[] = [];
    let totalUsd = 0n;

    tokenAddresses.forEach((tokenAddress) => {
      const tokenConfig = tokenMap[tokenAddress];

      if (!tokenConfig) {
        return;
      }

      const balance = sumBalancesFromCalls(tokenBalancesResponse[tokenAddress], addresses.length);

      if (balance === 0n) {
        return;
      }

      const prices = pricesData?.[tokenAddress];
      const usdValue = prices ? convertToUsd(balance, tokenConfig.decimals, getMidPrice(prices)) ?? 0n : 0n;

      if (typeof usdValue === "bigint") {
        totalUsd += usdValue;
      }

      assets.push({
        address: tokenAddress,
        type: "token",
        balance,
        usdValue,
        chainId,
        token: tokenConfig,
        decimals: tokenConfig.decimals,
      });
    });

    return { assets, totalUsd };
  }, [addresses.length, chainId, requestConfig, tokenAddresses, tokenBalancesResponse, tokenMap, pricesData]);
}

function buildTreasuryTokensRequest({
  chainId,
  addresses,
  tokenAddresses,
}: {
  chainId: ContractsChainId;
  addresses: string[];
  tokenAddresses: string[];
}) {
  const multicallAddress = getContract(chainId, "Multicall");

  return tokenAddresses.reduce((acc, tokenAddress) => {
    const token = getToken(chainId, tokenAddress);
    const isNativeToken = token.address === NATIVE_TOKEN_ADDRESS;

    const calls = createBalanceCalls(addresses, {
      balanceMethodName: isNativeToken ? "getEthBalance" : "balanceOf",
    });

    acc[tokenAddress] = {
      contractAddress: isNativeToken ? multicallAddress : token.address,
      abiId: isNativeToken ? "Multicall" : "Token",
      calls,
    };

    return acc;
  }, {});
}
