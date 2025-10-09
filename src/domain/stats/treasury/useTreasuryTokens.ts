import { useMemo } from "react";

import { getContract } from "config/contracts";
import type { TokenPricesData } from "domain/synthetics/tokens";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import type { ContractCallConfig, ContractCallResult } from "lib/multicall";
import type { ContractsChainId } from "sdk/configs/chains";
import { getToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { Token } from "sdk/types/tokens";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import { TREASURY_EMPTY_RESULT } from "./constants";
import type { TreasuryBalanceAsset, TreasuryData } from "./types";

type MulticallContractResults = Record<string, ContractCallResult | undefined>;
type TreasuryMulticallRequest = MulticallRequestConfig<Record<string, { calls: Record<string, unknown> }>>;

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

function sumBalancesFromCalls(result: MulticallContractResults | undefined, addressesCount: number): bigint {
  if (!result || !addressesCount) {
    return 0n;
  }

  let balance = 0n;

  for (let index = 0; index < addressesCount; index++) {
    const rawValue = result[`balance_${index}`]?.returnValues?.[0];

    if (rawValue !== undefined && rawValue !== null) {
      balance += BigInt(rawValue);
    }
  }

  return balance;
}

function createBalanceCalls(
  addresses: string[],
  options: { balanceMethodName?: string; includeDecimals?: boolean } = {}
): Record<string, ContractCallConfig> {
  const { balanceMethodName = "balanceOf", includeDecimals } = options;

  const baseCalls: Record<string, ContractCallConfig> = includeDecimals
    ? {
        decimals: {
          methodName: "decimals",
          params: [],
        },
      }
    : {};

  return addresses.reduce<Record<string, ContractCallConfig>>((calls, account, index) => {
    calls[`balance_${index}`] = {
      methodName: balanceMethodName,
      params: [account],
    };

    return calls;
  }, baseCalls);
}

function buildTreasuryTokensRequest({
  chainId,
  addresses,
  tokenAddresses,
}: {
  chainId: ContractsChainId;
  addresses: string[];
  tokenAddresses: string[];
}): TreasuryMulticallRequest {
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
