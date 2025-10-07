import { useMemo } from "react";

import { getContract } from "config/contracts";
import { useTokenRecentPricesRequest } from "domain/synthetics/tokens";
import { CacheKey, MulticallRequestConfig, useMulticall } from "lib/multicall";
import type { ContractsChainId } from "sdk/configs/chains";
import { getToken, getTokensMap, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { Token } from "sdk/types/tokens";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

const TREASURY_ADDRESSES: string[] = [
  "0x4bd1cdaab4254fc43ef6424653ca2375b4c94c0e",
  "0xc6378ddf536410c14666dc59bc92b5ebc0f2f79e",
  "0x0263ad94023a5df6d64f54bfef089f1fbf8a4ca0",
  "0xea8a734db4c7ea50c32b5db8a0cb811707e8ace3",
  "0xe1f7c5209938780625e354dc546e28397f6ce174",
  "0x68863dde14303bced249ca8ec6af85d4694dea6a",
  "0x0339740d92fb8baf73bab0e9eb9494bc0df1cafd",
  "0x2c247a44928d66041d9f7b11a69d7a84d25207ba",
];

type TreasuryMulticallKey = [addresses: string[], tokenAddresses: string[]];

type TreasuryMulticallRequest = MulticallRequestConfig<Record<string, { calls: Record<string, unknown> }>>;

type TreasuryTokenBalance = {
  address: string;
  type: "token" | "gmxV2" | "uniswapV3" | "venus" | "pendle";
  balance: bigint;
  usdValue: bigint;
  chainId: ContractsChainId;
};

export type TreasuryData =
  | {
      tokens: TreasuryTokenBalance[];
      totalUsd: bigint;
    }
  | undefined;

function buildTreasuryBalancesRequest(chainId: ContractsChainId, key: CacheKey): TreasuryMulticallRequest {
  const [addresses, tokenAddresses] = key as TreasuryMulticallKey;
  const multicallAddress = getContract(chainId, "Multicall");

  return tokenAddresses.reduce((acc, tokenAddress) => {
    const token = getToken(chainId, tokenAddress);
    const isNativeToken = token.address === NATIVE_TOKEN_ADDRESS;

    const calls = addresses.reduce(
      (calls, account, index) => {
        calls[`balance_${index}`] = {
          methodName: isNativeToken ? "getEthBalance" : "balanceOf",
          params: [account],
        };

        return calls;
      },
      {} as Record<string, { methodName: string; params: [string] }>
    );

    acc[tokenAddress] = {
      contractAddress: isNativeToken ? multicallAddress : token.address,
      abiId: isNativeToken ? "Multicall" : "Token",
      calls,
    };

    return acc;
  }, {} as TreasuryMulticallRequest);
}

export function useTreasury(chainId: ContractsChainId): TreasuryData {
  const addresses = TREASURY_ADDRESSES;

  const tokenMap = useMemo(() => getTokensMap(chainId), [chainId]);
  const tokenAddresses = useMemo(() => {
    const uniqueAddresses = new Set<string>();

    (Object.values(tokenMap) as Token[]).forEach((token) => {
      if (token.isSynthetic || !token.address.startsWith("0x")) {
        return;
      }

      uniqueAddresses.add(token.address);
    });

    return Array.from(uniqueAddresses);
  }, [tokenMap]);

  const { pricesData } = useTokenRecentPricesRequest(chainId);

  const { data: balancesResponse } = useMulticall(chainId, "useTreasury", {
    key: [addresses, tokenAddresses],
    request: buildTreasuryBalancesRequest,
    parseResponse: (res) => res.data,
  });

  const data = useMemo(() => {
    if (!balancesResponse) {
      return undefined;
    }

    const tokens: TreasuryTokenBalance[] = [];
    let totalUsd = 0n;

    tokenAddresses.forEach((tokenAddress) => {
      const tokenConfig = tokenMap[tokenAddress];

      if (!tokenConfig) {
        return;
      }

      const contractResult = balancesResponse[tokenAddress];

      if (!contractResult) {
        return;
      }

      let balance = 0n;

      addresses.forEach((_, index) => {
        const callKey = `balance_${index}`;
        const callResult = contractResult[callKey as keyof typeof contractResult];
        const rawValue = callResult?.returnValues?.[0];

        if (rawValue !== undefined && rawValue !== null) {
          const parsedValue = typeof rawValue === "bigint" ? rawValue : BigInt(rawValue);
          balance += parsedValue;
        }
      });

      if (balance === 0n) {
        return;
      }

      const prices = pricesData?.[tokenAddress];
      const usdValue = prices ? convertToUsd(balance, tokenConfig.decimals, getMidPrice(prices)) : undefined;

      if (usdValue !== undefined) {
        totalUsd += usdValue;
      }

      tokens.push({
        address: tokenAddress,
        type: "token",
        balance,
        usdValue: usdValue ?? 0n,
        chainId,
      });
    });

    if (!tokens.length) {
      return undefined;
    }

    return {
      tokens,
      totalUsd,
    };
  }, [addresses, balancesResponse, pricesData, tokenAddresses, tokenMap, chainId]);
  return data;
}
