import { getContract } from "config/contracts";
import MarketStore from "abis/MarketStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { useMulticall } from "lib/multicall";
import { getCorrectTokenAddress } from "config/tokens";
import { useMemo } from "react";
import { Market, MarketsData } from "./types";

export function useMarketsData(chainId: number): MarketsData {
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
      reader: {
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
      const marketsMap: { [address: string]: Market } = {};

      for (let market of res.reader.markets.returnValues) {
        try {
          marketsMap[market[0]] = {
            marketTokenAddress: market[0],
            indexTokenAddress: getCorrectTokenAddress(chainId, market[1], "native"),
            longTokenAddress: getCorrectTokenAddress(chainId, market[2], "native"),
            shortTokenAddress: market[3],
            data: market[4],
            // TODO: store in configs?
            perp: "USD",
          };
        } catch (e) {
          // ignore parsing errors on unknown tokens
        }
      }

      return marketsMap;
    },
  });

  return useMemo(() => {
    return marketsMap || {};
  }, [marketsMap]);
}
