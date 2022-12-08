import { getContract } from "config/contracts";
import MarketStore from "abis/MarketStore.json";
import { useMulticall } from "lib/multicall";
import { useMemo } from "react";
import { ethers } from "ethers";
import { MarketsData, SyntheticsMarket } from "./types";
import { getToken } from "config/tokens";
import { ContractCallConfig } from "lib/multicall/types";

export function useMarkets(chainId: number): MarketsData {
  const { data: marketsCount } = useMulticall(chainId, "useMarkets-count", {
    key: [],
    refreshInterval: 15000,
    request: {
      marketStore: {
        contractAddress: getContract(chainId, "MarketStore"),
        abi: MarketStore.abi,
        calls: {
          count: {
            methodName: "getMarketCount",
            params: [],
          },
        },
      },
    },
    parseResponse: (res) => res.marketStore.count.returnValues[0] as number,
  });

  const { data: marketKeys } = useMulticall(chainId, "useMarkets-keys", {
    key: Boolean(marketsCount) && [marketsCount],
    refreshInterval: 15000,
    request: {
      marketStore: {
        contractAddress: getContract(chainId, "MarketStore"),
        abi: MarketStore.abi,
        calls: {
          marketKeys: {
            methodName: "getMarketKeys",
            params: [0, marketsCount!],
          },
        },
      },
    },
    parseResponse: (res) => res.marketStore.marketKeys.returnValues as string[],
  });

  const { data: marketsMap } = useMulticall(chainId, "useMarkets-markets", {
    key: Boolean(marketKeys?.length) && marketKeys,
    refreshInterval: 15000,
    request: () => ({
      marketStore: {
        contractAddress: getContract(chainId, "MarketStore"),
        abi: MarketStore.abi,
        calls: marketKeys!.reduce((calls, marketAddress) => {
          calls[marketAddress] = {
            methodName: "get",
            params: [marketAddress],
          };

          return calls;
        }, {} as { [address: string]: ContractCallConfig }),
      },
    }),
    parseResponse: (res) => {
      const marketsMap: { [address: string]: SyntheticsMarket } = {};

      const addresses = Object.keys(res.marketStore);

      for (let marketAddress of addresses) {
        const returnValues = res.marketStore[marketAddress].returnValues;

        marketsMap[marketAddress] = {
          marketTokenAddress: returnValues[0],
          indexTokenAddress: toUnwrappedNativeToken(chainId, returnValues[1]),
          longTokenAddress: toUnwrappedNativeToken(chainId, returnValues[2]),
          shortTokenAddress: toUnwrappedNativeToken(chainId, returnValues[3]),
          data: returnValues[4],
        };
      }

      return marketsMap;
    },
  });

  return useMemo(
    () => ({
      markets: marketsMap || {},
      marketKeys: marketKeys || [],
    }),
    [marketsMap, marketKeys]
  );
}

export function toUnwrappedNativeToken(chainId: number, address: string) {
  try {
    const token = getToken(chainId, address);

    if (token.isWrapped) return ethers.constants.AddressZero;

    return address;
  } catch (e) {
    return ethers.constants.AddressZero;
  }
}
