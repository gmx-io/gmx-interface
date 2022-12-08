import { getContract } from "config/contracts";
import MarketStore from "abis/MarketStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { useMulticall } from "lib/multicall";
import { useMemo } from "react";
import { ethers } from "ethers";
import { MarketsData, SyntheticsMarket } from "./types";
import { getToken } from "config/tokens";

export function useMarkets(chainId: number): MarketsData {
  const { data: marketsCount } = useMulticall(chainId, "useMarkets-count", {
    key: [],
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

  const { data: marketsMap } = useMulticall(chainId, "useMarkets-markets", {
    key: Boolean(marketsCount) && [marketsCount],
    request: () => ({
      marketStore: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          markets: {
            methodName: "getMarkets",
            params: [getContract(chainId, "MarketStore"), 0, marketsCount],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const marketsMap: { [address: string]: SyntheticsMarket } = {};

      for (let market of res.marketStore.markets.returnValues) {
        marketsMap[market[0]] = {
          marketTokenAddress: market[0],
          indexTokenAddress: toUnwrappedNativeToken(chainId, market[1]),
          longTokenAddress: toUnwrappedNativeToken(chainId, market[2]),
          shortTokenAddress: toUnwrappedNativeToken(chainId, market[3]),
          data: market[4],
        };
      }

      return marketsMap;
    },
  });

  return useMemo(
    () => ({
      markets: marketsMap || {},
    }),
    [marketsMap]
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
